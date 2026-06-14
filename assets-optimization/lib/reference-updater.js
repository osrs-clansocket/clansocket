import fs from "node:fs";
import path from "node:path";
import { uiLogger } from "./notifications/ui-logger.js";

const SCAN_DIRS = ["main"];

const SCAN_EXTENSIONS = new Set([".js", ".css", ".ts", ".html", ".json"]);

export class ReferenceUpdater {
    async updateReferences(conversions) {
        const renameMap = this.buildRenameMap(conversions);
        if (renameMap.size === 0) {
            return;
        }

        let updatedFiles = 0;
        let updatedRefs = 0;

        for (const scanDir of SCAN_DIRS) {
            const resolved = path.resolve(scanDir);
            if (!fs.existsSync(resolved)) {
                continue;
            }

            const result = this.scanDirectory(resolved, renameMap);
            updatedFiles += result.files;
            updatedRefs += result.refs;
        }

        if (updatedRefs > 0) {
            uiLogger.force(`Updated ${updatedRefs} references in ${updatedFiles} files`);
        } else {
            uiLogger.force("No code references needed updating");
        }

        return updatedRefs;
    }

    buildRenameMap(conversions) {
        const map = new Map();
        for (const conv of conversions) {
            if (conv.converted && conv.src !== conv.dest) {
                map.set(conv.src, conv.dest);
            }
        }
        return map;
    }

    scanDirectory(dir, renameMap) {
        let files = 0;
        let refs = 0;

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (entry.name === "node_modules" || entry.name === ".git") {
                    continue;
                }
                const result = this.scanDirectory(fullPath, renameMap);
                files += result.files;
                refs += result.refs;
                continue;
            }

            const ext = path.extname(entry.name).toLowerCase();
            if (!SCAN_EXTENSIONS.has(ext)) {
                continue;
            }

            const result = this.updateFile(fullPath, renameMap);
            if (result > 0) {
                files++;
                refs += result;
            }
        }

        return { files, refs };
    }

    updateFile(filePath, renameMap) {
        let content = fs.readFileSync(filePath, "utf8");
        let replacements = 0;

        for (const [oldName, newName] of renameMap) {
            if (content.includes(oldName)) {
                let count = 0;
                let pos = 0;
                while ((pos = content.indexOf(oldName, pos)) !== -1) {
                    count++;
                    pos += oldName.length;
                }
                content = content.replaceAll(oldName, newName);
                replacements += count;
            }
        }

        if (replacements > 0) {
            fs.writeFileSync(filePath, content, "utf8");
        }

        return replacements;
    }
}
