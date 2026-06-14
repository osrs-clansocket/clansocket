import { BaseConvertor } from "./base-convertor.js";
import { FORMAT_MAP, QUALITY } from "./constants.js";

export class ImageConvertor extends BaseConvertor {
    constructor() {
        super("ImageConvertor", FORMAT_MAP.image);
        this.sharp = null;
    }

    async isAvailable() {
        try {
            const sharpModule = await import("sharp");
            this.sharp = sharpModule.default;
            this.available = true;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    async convert(inputPath, outputPath) {
        await this.sharp(inputPath).webp({ quality: QUALITY.imageWebp }).toFile(outputPath);
    }
}
