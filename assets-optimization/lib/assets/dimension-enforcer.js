import fs from "node:fs";
import path from "node:path";
import { uiLogger } from "../notifications/ui-logger.js";

const DIMENSION_PATTERN = /(?:_h(\d+))?(?:_w(\d+))?(?:_h(\d+))?$/;
const IMAGE_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".avif"]);

function parseDimensions(filename) {
    const ext = path.extname(filename);
    const base = filename.slice(0, filename.length - ext.length);

    let height = null;
    let width = null;

    const hMatch = base.match(/_h(\d+)/);
    const wMatch = base.match(/_w(\d+)/);

    if (hMatch) height = parseInt(hMatch[1], 10);
    if (wMatch) width = parseInt(wMatch[1], 10);

    if (!height && !width) return null;
    return { width, height };
}

export class DimensionEnforcer {
    constructor() {
        this.sharp = null;
        this.stats = { checked: 0, resized: 0, skipped: 0 };
    }

    async init() {
        try {
            const sharpModule = await import("sharp");
            this.sharp = sharpModule.default;
            return true;
        } catch {
            uiLogger.force("⚠ sharp not available, dimension enforcement skipped");
            return false;
        }
    }

    async enforce(sourcePath) {
        if (!this.sharp) return;

        uiLogger.force("\nEnforcing dimension markers...");

        const files = [];
        this.scan(sourcePath, sourcePath, files);

        const targets = files.filter((f) => parseDimensions(f.name));

        if (targets.length === 0) {
            uiLogger.force("No dimension-marked files found");
            return;
        }

        uiLogger.force(`${targets.length} dimension-marked files to check`);

        for (let i = 0; i < targets.length; i++) {
            const file = targets[i];
            uiLogger.progress(i + 1, targets.length, file.name);
            await this.processFile(file);
        }

        uiLogger.progressDone();
        uiLogger.force(`Dimensions: ${this.stats.checked} checked, ${this.stats.resized} resized, ${this.stats.skipped} already correct`);
    }

    async processFile(file) {
        const target = parseDimensions(file.name);
        if (!target) return;

        this.stats.checked++;

        try {
            const metadata = await this.sharp(file.fullPath).metadata();
            const actualW = metadata.width;
            const actualH = metadata.height;

            const needsWidth = target.width && actualW !== target.width;
            const needsHeight = target.height && actualH !== target.height;

            if (!needsWidth && !needsHeight) {
                this.stats.skipped++;
                return;
            }

            const resizeOpts = {};
            if (target.width) resizeOpts.width = target.width;
            if (target.height) resizeOpts.height = target.height;
            resizeOpts.fit = "inside";
            resizeOpts.withoutEnlargement = false;

            const buffer = await this.sharp(file.fullPath)
                .resize(resizeOpts)
                .toBuffer();

            fs.writeFileSync(file.fullPath, buffer);
            this.stats.resized++;
        } catch (error) {
            uiLogger.progressDone();
            uiLogger.force(`⚠ Failed to enforce dimensions on ${file.name}: ${error.message}`);
        }
    }

    scan(dir, rootSource, results) {
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                this.scan(fullPath, rootSource, results);
                continue;
            }

            const ext = path.extname(entry.name).toLowerCase();
            if (!IMAGE_EXTENSIONS.has(ext)) continue;

            const relDir = path.relative(rootSource, dir).replaceAll("\\", "/");
            results.push({ name: entry.name, fullPath, relDir, ext });
        }
    }
}
