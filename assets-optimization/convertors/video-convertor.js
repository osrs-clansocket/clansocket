import { execSync } from "node:child_process";
import fs from "node:fs";
import { BaseConvertor } from "./base-convertor.js";
import { FORMAT_MAP, QUALITY, VIDEO_MAX, FFMPEG_PATH, FFPROBE_PATH } from "./constants.js";

export class VideoConvertor extends BaseConvertor {
    constructor() {
        super("VideoConvertor", FORMAT_MAP.video);
    }

    async isAvailable() {
        try {
            execSync(`"${FFPROBE_PATH}" -version`, { stdio: "pipe" });
            execSync(`"${FFMPEG_PATH}" -version`, { stdio: "pipe" });
            this.available = true;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    probe(inputPath) {
        const result = execSync(
            `"${FFPROBE_PATH}" -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of csv=p=0 "${inputPath}"`,
            { stdio: "pipe", encoding: "utf8" }
        );

        const parts = result.trim().split(",");
        return {
            codec: parts[0],
            width: parseInt(parts[1], 10),
            height: parseInt(parts[2], 10),
        };
    }

    needsProcessing(inputPath, sourceExt) {
        const isAlreadyMp4 = sourceExt === "mp4";

        if (!isAlreadyMp4) {
            return { needed: true, reason: "format" };
        }

        try {
            const info = this.probe(inputPath);
            const oversized = info.width > VIDEO_MAX.width || info.height > VIDEO_MAX.height;

            if (oversized) {
                return { needed: true, reason: "resize" };
            }

            return { needed: false };
        } catch {
            return { needed: false };
        }
    }

    async convert(inputPath, outputPath) {
        const ext = inputPath.split(".").pop().toLowerCase();
        const check = this.needsProcessing(inputPath, ext);

        if (!check.needed) {
            fs.copyFileSync(inputPath, outputPath);
            return;
        }

        const scaleFilter = `-vf "scale='min(${VIDEO_MAX.width},iw)':'min(${VIDEO_MAX.height},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"`;

        execSync(
            `"${FFMPEG_PATH}" -y -i "${inputPath}" ${scaleFilter} -c:v libx264 -crf ${QUALITY.videoCrf} -c:a aac -b:a ${QUALITY.videoAudioBitrate} "${outputPath}"`,
            { stdio: "pipe" }
        );
    }
}
