import fs from "node:fs";
import path from "node:path";
import { uiLogger } from "../notifications/ui-logger.js";

export function normalizeName(filename) {
    const ext = path.extname(filename);
    const base = filename.slice(0, filename.length - ext.length);
    const normalized = base
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .toLowerCase();
    return normalized + ext.toLowerCase();
}

export async function convertFile(optimizer, file, convertor, stagingAssets) {
    const convertedName = convertor.getOutputFilename(file.name);
    const outputName = normalizeName(convertedName);
    const stagingSubDir = path.join(stagingAssets, file.relDir);
    fs.mkdirSync(stagingSubDir, { recursive: true });
    const outputPath = path.join(stagingSubDir, outputName);

    const fileHash = optimizer.hashFile(file.fullPath);
    const cacheKey = path.relative(process.cwd(), file.fullPath).replaceAll("\\", "/");
    const cached = optimizer.cacheIndex[cacheKey];

    if (cached && cached.hash === fileHash) {
        const cachedFile = path.join(optimizer.cacheDir, cached.cachedFile);
        if (fs.existsSync(cachedFile)) {
            fs.copyFileSync(cachedFile, outputPath);
            optimizer.trackStat(file.ext, convertor.getTargetExt(file.ext));
            return { src: file.name, dest: outputName, relDir: file.relDir, converted: true, cached: true };
        }
    }

    try {
        await convertor.convert(file.fullPath, outputPath);
        optimizer.cacheConversion(cacheKey, fileHash, outputPath);
        optimizer.trackStat(file.ext, convertor.getTargetExt(file.ext));
        return { src: file.name, dest: outputName, relDir: file.relDir, converted: true };
    } catch (error) {
        uiLogger.progressDone();
        uiLogger.force(`⚠ Failed to convert ${file.name}: ${error.message}`);
        return { src: file.name, dest: file.name, relDir: file.relDir, converted: false };
    }
}

export function applyToSource(sourceRoot, stagingRoot, conversions) {
    let applied = 0;
    for (const conv of conversions) {
        if (!conv.converted) {
            continue;
        }

        const subDir = conv.relDir || "";
        const stagedFile = path.join(stagingRoot, subDir, conv.dest);
        const originalFile = path.join(sourceRoot, subDir, conv.src);
        const targetFile = path.join(sourceRoot, subDir, conv.dest);

        if (!fs.existsSync(stagedFile) || !fs.existsSync(originalFile)) {
            continue;
        }

        fs.copyFileSync(stagedFile, targetFile);
        if (conv.src !== conv.dest) {
            fs.unlinkSync(originalFile);
        }
        applied++;
    }
    if (applied > 0) {
        uiLogger.force(`Applied ${applied} conversions in-place`);
    }
    return applied;
}
