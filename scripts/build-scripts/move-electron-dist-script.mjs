import { rmSync, renameSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..", "..");
const SRC = resolve(APP_ROOT, "main", "electron", "dist");
const DST = resolve(APP_ROOT, "desktop-dist");

if (!existsSync(SRC)) {
    process.stderr.write("source dir " + SRC + " does not exist\n");
    process.exit(1);
}

if (existsSync(DST)) {
    rmSync(DST, { recursive: true, force: true });
}

renameSync(SRC, DST);
process.stdout.write("moved " + SRC + " -> " + DST + "\n");
