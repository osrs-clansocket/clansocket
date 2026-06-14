import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_FFMPEG_DIR = path.resolve(__dirname, "..", "ffmpeg", `${process.platform}-${process.arch}`);

export const FFMPEG_PATH = resolveBinary("ffmpeg");
export const FFPROBE_PATH = resolveBinary("ffprobe");

function resolveBinary(name) {
    const filename = process.platform === "win32" ? `${name}.exe` : name;
    const projectLocal = path.join(PROJECT_FFMPEG_DIR, filename);
    if (existsSync(projectLocal)) return projectLocal;
    if (systemBinaryAvailable(name)) return name;
    return name;
}

function systemBinaryAvailable(name) {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(cmd, [name], { stdio: "pipe", shell: true });
    return result.status === 0;
}

export const FORMAT_MAP = {
    image: {
        png: "webp",
        jpg: "webp",
        jpeg: "webp",
        bmp: "webp",
        tiff: "webp",
        tif: "webp",
        heic: "webp",
        heif: "webp",
    },
    font: {
        ttf: "woff2",
        otf: "woff2",
        woff: "woff2",
        eot: "woff2",
    },
    audio: {
        wav: "opus",
        mp3: "opus",
        flac: "opus",
        aac: "opus",
        m4a: "opus",
        aiff: "opus",
        wma: "opus",
        ogg: "opus",
    },
    video: {
        avi: "mp4",
        mov: "mp4",
        wmv: "mp4",
        flv: "mp4",
        mkv: "mp4",
        m4v: "mp4",
        "3gp": "mp4",
        mp4: "mp4",
    },
};

export const SKIP_EXTENSIONS = new Set(["webp", "woff2", "opus", "svg", "avif", "ico", "webm", "gif"]);

export const QUALITY = {
    imageWebp: 80,
    audioOpusBitrate: "96k",
    videoCrf: 23,
    videoAudioBitrate: "128k",
};

export const VIDEO_MAX = {
    width: 1280,
    height: 720,
};

export const CACHE_DIR = ".cache/sync";
