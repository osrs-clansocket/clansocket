import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SKIP_EXTENSIONS, CACHE_DIR } from "../../convertors/constants.js";
import { EXCLUDED_DIRS } from "../../constants.js";
import { hashFile, loadCache, saveCache, cacheConversion } from "./asset-cache.js";
import { convertFile, applyToSource, normalizeName } from "./asset-conversion.js";
import { ImageConvertor } from "../../convertors/image-convertor.js";
import { FontConvertor } from "../../convertors/font-convertor.js";
import { AudioConvertor } from "../../convertors/audio-convertor.js";
import { VideoConvertor } from "../../convertors/video-convertor.js";
import { uiLogger } from "../notifications/ui-logger.js";

const CONVERTOR_PRIORITY = ["ImageConvertor", "FontConvertor", "AudioConvertor", "VideoConvertor"];

export class AssetOptimizer {
    constructor() {
        this.convertors = [new ImageConvertor(), new FontConvertor(), new AudioConvertor(), new VideoConvertor()];
        this.cacheDir = path.resolve(CACHE_DIR);
        this.cacheIndex = {};
        this.stats = {};
    }

    async optimizeInPlace(sourcePath) {
        uiLogger.force("Optimizing assets...\n");

        const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "assets-optimize-"));
        const stagingAssets = path.join(stagingDir, path.basename(sourcePath));

        try {
            await this.initConvertors();
            this.loadCache();

            const allFiles = [];
            this.scanFiles(sourcePath, sourcePath, allFiles);
            uiLogger.force(`Scanned ${allFiles.length} total files`);

            const { groups, skipped } = this.classifyFiles(allFiles);

            const conversions = [];
            for (const f of skipped) {
                const normalized = normalizeName(f.name);
                const needsRename = normalized !== f.name;
                if (needsRename) {
                    const srcPath = path.join(sourcePath, f.relDir, f.name);
                    const destPath = path.join(sourcePath, f.relDir, normalized);
                    fs.renameSync(srcPath, destPath);
                }
                conversions.push({
                    src: f.name,
                    dest: normalized,
                    relDir: f.relDir,
                    converted: needsRename,
                });
            }

            const totalConvertible = groups.reduce((sum, g) => sum + g.files.length, 0);
            uiLogger.force(`${totalConvertible} files to convert, ${skipped.length} already optimal\n`);

            let completed = 0;

            for (const group of groups) {
                if (group.files.length === 0) {
                    continue;
                }

                uiLogger.force(`${group.convertor.name}: ${group.files.length} files`);

                for (const file of group.files) {
                    completed++;
                    uiLogger.progress(completed, totalConvertible, file.name);

                    const conv = await this.convertFile(file, group.convertor, sourcePath, stagingAssets);
                    conversions.push(conv);
                }

                uiLogger.progressDone();
            }

            this.saveCache();
            this.logSummary();

            const applied = this.applyToSource(sourcePath, stagingAssets, conversions);

            return { conversions, applied };
        } finally {
            if (fs.existsSync(stagingDir)) {
                fs.rmSync(stagingDir, { recursive: true, force: true });
            }
        }
    }

    scanFiles(dir, rootSource, results) {
        if (!fs.existsSync(dir)) {
            return;
        }

        const relDir = path.relative(rootSource, dir).replaceAll("\\", "/");
        for (const excluded of EXCLUDED_DIRS) {
            if (relDir === excluded || relDir.startsWith(`${excluded}/`)) return;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                this.scanFiles(fullPath, rootSource, results);
                continue;
            }

            const ext = path.extname(entry.name).slice(1).toLowerCase();
            results.push({ name: entry.name, fullPath, relDir, ext });
        }
    }

    classifyFiles(allFiles) {
        const groups = CONVERTOR_PRIORITY.map((name) => ({
            convertor: this.convertors.find((c) => c.name === name),
            files: [],
        })).filter((g) => g.convertor?.available);

        const skipped = [];

        for (const file of allFiles) {
            if (SKIP_EXTENSIONS.has(file.ext) || !file.ext) {
                skipped.push(file);
                continue;
            }

            const group = groups.find((g) => g.convertor.canConvert(file.ext));

            if (group) {
                group.files.push(file);
            } else {
                skipped.push(file);
            }
        }

        return { groups, skipped };
    }

    async convertFile(file, convertor, sourcePath, stagingAssets) {
        return convertFile(this, file, convertor, stagingAssets);
    }

    applyToSource(sourceRoot, stagingRoot, conversions) {
        return applyToSource(sourceRoot, stagingRoot, conversions);
    }

    async initConvertors() {
        for (const convertor of this.convertors) {
            const available = await convertor.isAvailable();
            if (available) {
                uiLogger.force(`✓ ${convertor.name}: available`);
            } else {
                uiLogger.force(`⚠ ${convertor.name}: not available, skipping`);
            }
        }
    }

    hashFile(filePath) {
        return hashFile(filePath);
    }
    loadCache() {
        this.cacheIndex = loadCache(this.cacheDir);
    }
    saveCache() {
        saveCache(this.cacheDir, this.cacheIndex);
    }
    cacheConversion(cacheKey, fileHash, outputPath) {
        cacheConversion(this.cacheDir, this.cacheIndex, { cacheKey, fileHash, outputPath });
    }

    trackStat(fromExt, toExt) {
        const key = `${fromExt}→${toExt}`;
        this.stats[key] = (this.stats[key] || 0) + 1;
    }

    logSummary() {
        const entries = Object.entries(this.stats);
        if (entries.length === 0) {
            uiLogger.force("No conversions needed");
            return;
        }
        const parts = entries.map(([key, count]) => `${count} ${key}`);
        uiLogger.force(`\nConverted: ${parts.join(", ")}`);
    }
}
