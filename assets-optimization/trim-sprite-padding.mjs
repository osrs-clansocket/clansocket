import sharp from "sharp";
import { readdir, readFile, writeFile } from "fs/promises";
import { resolve, join } from "path";

const ROOT = resolve("public/resources/osrs");
const GAME_SPRITES = "game_sprites";
const CONCURRENCY = 16;

async function trimFile(path) {
    try {
        const inputBuffer = await readFile(path);
        const before = await sharp(inputBuffer).metadata();
        const result = await sharp(inputBuffer).trim().webp({ lossless: true }).toBuffer();
        const after = await sharp(result).metadata();
        if (after.width === before.width && after.height === before.height) return null;
        await writeFile(path, result);
        return { before, after };
    } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}

async function collectWebps(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length > 0) {
        const cur = stack.pop();
        const entries = await readdir(cur, { withFileTypes: true });
        for (const entry of entries) {
            const full = join(cur, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile() && entry.name.endsWith(".webp")) out.push(full);
        }
    }
    return out;
}

async function processBatched(files, onResult) {
    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(async (path) => ({ path, result: await trimFile(path) })));
        for (const { path, result } of results) onResult(path, result);
    }
}

async function discoverTargets() {
    const rootEntries = await readdir(ROOT, { withFileTypes: true });
    const targets = [];
    for (const entry of rootEntries) {
        if (entry.isDirectory() && entry.name.startsWith("icon_")) {
            targets.push(join(ROOT, entry.name));
        }
    }
    const gameSpritesPath = join(ROOT, GAME_SPRITES);
    try {
        const gsEntries = await readdir(gameSpritesPath, { withFileTypes: true });
        for (const entry of gsEntries) {
            if (entry.isDirectory()) targets.push(join(gameSpritesPath, entry.name));
        }
    } catch {
        // game_sprites missing -- skip
    }
    return targets;
}

const targets = await discoverTargets();
if (targets.length === 0) {
    console.log(`no icon_* folders or game_sprites/* subfolders found under ${ROOT}`);
    process.exit(0);
}

let totalTrimmed = 0;
let totalSkipped = 0;
let totalErrors = 0;
let totalFiles = 0;

for (const dir of targets) {
    const files = await collectWebps(dir);
    if (files.length === 0) {
        console.log(`${dir.slice(ROOT.length + 1)}: (no .webp files)`);
        continue;
    }
    let trimmed = 0;
    let skipped = 0;
    let errors = 0;
    await processBatched(files, (path, result) => {
        const rel = path.slice(ROOT.length + 1);
        if (result === null) {
            skipped++;
            return;
        }
        if ("error" in result) {
            errors++;
            console.log(`  ${rel.padEnd(60)} ERROR: ${result.error}`);
            return;
        }
        trimmed++;
        console.log(`  ${rel.padEnd(60)} ${result.before.width}x${result.before.height} -> ${result.after.width}x${result.after.height}`);
    });
    console.log(`${dir.slice(ROOT.length + 1)}: ${trimmed} trimmed, ${skipped} already tight, ${errors} errors, ${files.length} total`);
    totalTrimmed += trimmed;
    totalSkipped += skipped;
    totalErrors += errors;
    totalFiles += files.length;
}

console.log(`\ndone -- ${totalTrimmed} trimmed, ${totalSkipped} already tight, ${totalErrors} errors, ${totalFiles} total across ${targets.length} folders`);
