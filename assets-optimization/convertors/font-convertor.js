import fs from "node:fs";
import { BaseConvertor } from "./base-convertor.js";
import { FORMAT_MAP } from "./constants.js";

export class FontConvertor extends BaseConvertor {
    constructor() {
        super("FontConvertor", FORMAT_MAP.font);
        this.wawoff2 = null;
    }

    async isAvailable() {
        try {
            this.wawoff2 = await import("wawoff2");
            this.available = true;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    async convert(inputPath, outputPath) {
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = await this.wawoff2.compress(inputBuffer);
        fs.writeFileSync(outputPath, Buffer.from(outputBuffer));
    }
}
