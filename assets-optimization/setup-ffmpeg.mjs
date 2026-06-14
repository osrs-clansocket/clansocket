#!/usr/bin/env node
import { mkdir, rename, rm, chmod, readdir } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import extractZip from "extract-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG_DIR = path.resolve(__dirname, "ffmpeg");
const FFMPEG_VERSION = "8.0.1";

const PLATFORM_BUILDS = {
    "win32-x64": [
        {
            url: `https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-${FFMPEG_VERSION}-essentials_build.zip`,
            type: "zip",
            extractsTo: `ffmpeg-${FFMPEG_VERSION}-essentials_build`,
            binSubpath: "bin",
            binaries: ["ffmpeg.exe", "ffprobe.exe"],
        },
    ],
    "darwin-arm64": [
        { url: "https://www.osxexperts.net/ffmpeg711arm.zip", type: "zip", binary: "ffmpeg" },
        { url: "https://www.osxexperts.net/ffprobe71arm.zip", type: "zip", binary: "ffprobe" },
    ],
    "darwin-x64": [
        { url: "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip", type: "zip", binary: "ffmpeg" },
        { url: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip", type: "zip", binary: "ffprobe" },
    ],
    "linux-x64": [
        {
            url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz",
            type: "tar.xz",
            binaries: ["ffmpeg", "ffprobe"],
        },
    ],
    "linux-arm64": [
        {
            url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz",
            type: "tar.xz",
            binaries: ["ffmpeg", "ffprobe"],
        },
    ],
};

async function main() {
    const platformKey = `${process.platform}-${process.arch}`;
    const archives = PLATFORM_BUILDS[platformKey];
    if (!archives) {
        fail(`unsupported platform: ${platformKey}. supported: ${Object.keys(PLATFORM_BUILDS).join(", ")}`);
    }
    if (systemFfmpegPresent()) {
        info("system ffmpeg + ffprobe detected on PATH — skipping download");
        return;
    }
    const installDir = path.join(FFMPEG_DIR, platformKey);
    if (await binariesAlreadyInstalled(installDir, archives)) {
        info(`binaries already at ${installDir} — skipping download`);
        return;
    }
    await mkdir(installDir, { recursive: true });
    for (const archive of archives) {
        await processArchive(archive, installDir);
    }
    verifyInstall(installDir);
    info(`installed to ${installDir}`);
}

function systemFfmpegPresent() {
    const cmd = process.platform === "win32" ? "where" : "which";
    const f = spawnSync(cmd, ["ffmpeg"], { stdio: "pipe", shell: true });
    const p = spawnSync(cmd, ["ffprobe"], { stdio: "pipe", shell: true });
    return f.status === 0 && p.status === 0;
}

async function binariesAlreadyInstalled(installDir, archives) {
    const expected = expectedBinaries(archives);
    for (const bin of expected) {
        if (!existsSync(path.join(installDir, bin))) return false;
    }
    return expected.length > 0;
}

function expectedBinaries(archives) {
    const all = [];
    for (const a of archives) {
        if (a.binaries) all.push(...a.binaries);
        else if (a.binary) all.push(binaryFileName(a.binary));
    }
    return all;
}

function binaryFileName(base) {
    return process.platform === "win32" ? `${base}.exe` : base;
}

async function processArchive(archive, installDir) {
    const tmpArchive = path.join(tmpdir(), `ffmpeg-setup-${Date.now()}-${randomTag()}.${archive.type.replace(".", "_")}`);
    const tmpExtract = path.join(tmpdir(), `ffmpeg-extract-${Date.now()}-${randomTag()}`);
    try {
        info(`downloading ${archive.url}`);
        await downloadFile(archive.url, tmpArchive);
        await mkdir(tmpExtract, { recursive: true });
        info(`extracting ${path.basename(tmpArchive)}`);
        await extractArchive(tmpArchive, tmpExtract, archive.type);
        await placeBinaries(archive, tmpExtract, installDir);
    } finally {
        await rm(tmpArchive, { force: true }).catch(() => {});
        await rm(tmpExtract, { recursive: true, force: true }).catch(() => {});
    }
}

function randomTag() {
    return Math.random().toString(36).slice(2, 8);
}

async function downloadFile(url, dest) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`);
    if (!res.body) fail(`download produced no body for ${url}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function extractArchive(archivePath, destDir, type) {
    if (type === "zip") return extractZip(archivePath, { dir: destDir });
    return extractTarXz(archivePath, destDir);
}

function extractTarXz(archivePath, destDir) {
    const r = spawnSync("tar", ["-xJf", archivePath, "-C", destDir], { stdio: "pipe", shell: true });
    if (r.status !== 0) fail(`tar.xz extract failed: ${r.stderr?.toString().trim()}`);
}

async function placeBinaries(archive, extractDir, installDir) {
    if (archive.binary) {
        const fname = binaryFileName(archive.binary);
        await moveBinary(path.join(extractDir, fname), path.join(installDir, fname));
        return;
    }
    if (archive.extractsTo) {
        const srcDir = path.join(extractDir, archive.extractsTo, archive.binSubpath || "");
        for (const bin of archive.binaries) {
            await moveBinary(path.join(srcDir, bin), path.join(installDir, bin));
        }
        return;
    }
    if (archive.binaries) {
        const innerFolder = await findInnerFolder(extractDir);
        const srcDir = innerFolder ? path.join(extractDir, innerFolder) : extractDir;
        for (const bin of archive.binaries) {
            const fname = binaryFileName(bin);
            await moveBinary(path.join(srcDir, fname), path.join(installDir, fname));
        }
    }
}

async function findInnerFolder(extractDir) {
    const entries = await readdir(extractDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    return dirs.length === 1 ? dirs[0].name : null;
}

async function moveBinary(src, dst) {
    if (!existsSync(src)) fail(`expected binary not found after extract: ${src}`);
    await rename(src, dst);
    if (process.platform !== "win32") await chmod(dst, 0o755);
}

function verifyInstall(installDir) {
    const ffmpeg = path.join(installDir, binaryFileName("ffmpeg"));
    const ffprobe = path.join(installDir, binaryFileName("ffprobe"));
    runVersionCheck(ffmpeg, "ffmpeg");
    runVersionCheck(ffprobe, "ffprobe");
}

function runVersionCheck(binPath, label) {
    const r = spawnSync(binPath, ["-version"], { stdio: "pipe" });
    if (r.status !== 0) fail(`${label} verify failed (exit ${r.status})`);
    const firstLine = r.stdout.toString().split("\n")[0];
    info(`verified ${label}: ${firstLine}`);
}

function info(msg) {
    process.stdout.write(`[setup-ffmpeg] ${msg}\n`);
}

function fail(msg) {
    process.stderr.write(`[setup-ffmpeg] error: ${msg}\n`);
    process.exit(1);
}

main().catch((err) => fail(err.message));
