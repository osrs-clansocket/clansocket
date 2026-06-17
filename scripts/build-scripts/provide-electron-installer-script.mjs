import { rmSync, renameSync, cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..", "..");

const pkgPath = resolve(APP_ROOT, "main", "electron", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = pkg.version;
const productName = pkg.build && pkg.build.productName ? pkg.build.productName : "ClanSocket";

function pad2(n) {
    return n < 10 ? "0" + n : String(n);
}

const now = new Date();
const month = pad2(now.getMonth() + 1);
const day = pad2(now.getDate());
const year = pad2(now.getFullYear() % 100);
const dateStr = month + day + year;

const SRC_DIR = resolve(APP_ROOT, "desktop-dist");
const DEST_DIR = resolve(APP_ROOT, "public", "provide");

const ARTIFACTS = [
    {
        src: productName + " Setup " + version + ".exe",
        dest: "clansocket-" + version + "-" + dateStr + ".exe",
        latest: "clansocket-latest.exe",
    },
    {
        src: productName + "-" + version + "-linux.tar.gz",
        dest: "clansocket-" + version + "-" + dateStr + "-linux.tar.gz",
        latest: "clansocket-latest-linux.tar.gz",
    },
];

if (!existsSync(DEST_DIR)) {
    mkdirSync(DEST_DIR, { recursive: true });
}

let moved = 0;
for (const artifact of ARTIFACTS) {
    const src = resolve(SRC_DIR, artifact.src);
    const dest = resolve(DEST_DIR, artifact.dest);
    const latest = resolve(DEST_DIR, artifact.latest);
    if (!existsSync(src)) {
        process.stdout.write("skip (not built): " + artifact.src + "\n");
        continue;
    }
    if (existsSync(dest)) rmSync(dest, { force: true });
    renameSync(src, dest);
    process.stdout.write("provided -> " + dest + "\n");
    if (existsSync(latest)) rmSync(latest, { force: true });
    cpSync(dest, latest);
    process.stdout.write("alias    -> " + latest + "\n");
    moved++;
}

if (moved === 0) {
    process.stderr.write("no installer artifacts found in " + SRC_DIR + "\n");
    process.exit(1);
}
