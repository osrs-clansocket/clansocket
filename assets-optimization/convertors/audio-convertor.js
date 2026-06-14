import { execSync } from "node:child_process";
import { BaseConvertor } from "./base-convertor.js";
import { FORMAT_MAP, QUALITY, FFMPEG_PATH } from "./constants.js";

export class AudioConvertor extends BaseConvertor {
    constructor() {
        super("AudioConvertor", FORMAT_MAP.audio);
    }

    async isAvailable() {
        try {
            execSync(`"${FFMPEG_PATH}" -version`, { stdio: "pipe" });
            this.available = true;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    async convert(inputPath, outputPath) {
        execSync(
            `"${FFMPEG_PATH}" -y -i "${inputPath}" -c:a libopus -b:a ${QUALITY.audioOpusBitrate} "${outputPath}"`,
            { stdio: "pipe" }
        );
    }
}
