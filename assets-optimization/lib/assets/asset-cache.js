import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CACHE_INDEX = "cache-index.json";

export function hashFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function loadCache(cacheDir) {
    const indexPath = path.join(cacheDir, CACHE_INDEX);
    if (fs.existsSync(indexPath)) {
        return JSON.parse(fs.readFileSync(indexPath, "utf8"));
    }
    return {};
}

export function saveCache(cacheDir, cacheIndex) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const indexPath = path.join(cacheDir, CACHE_INDEX);
    fs.writeFileSync(indexPath, JSON.stringify(cacheIndex, null, "\t"));
}

export function cacheConversion(cacheDir, cacheIndex, { cacheKey, fileHash, outputPath }) {
    fs.mkdirSync(path.join(cacheDir, "files"), { recursive: true });
    const cachedName = `files/${fileHash}${path.extname(outputPath)}`;
    fs.copyFileSync(outputPath, path.join(cacheDir, cachedName));
    cacheIndex[cacheKey] = { hash: fileHash, cachedFile: cachedName };
}
