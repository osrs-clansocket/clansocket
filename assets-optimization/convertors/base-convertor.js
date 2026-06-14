import path from "node:path";

export class BaseConvertor {
    constructor(name, formatMap) {
        this.name = name;
        this.formatMap = formatMap;
        this.available = false;
    }

    canConvert(ext) {
        return ext in this.formatMap;
    }

    getTargetExt(ext) {
        return this.formatMap[ext] || null;
    }

    getOutputFilename(filename) {
        const ext = path.extname(filename).slice(1).toLowerCase();
        const targetExt = this.getTargetExt(ext);
        if (!targetExt) {
            return filename;
        }

        const baseName = filename.slice(0, filename.length - ext.length);
        return `${baseName}${targetExt}`;
    }

    async isAvailable() {
        throw new Error(`${this.name}: isAvailable() not implemented`);
    }

    async convert() {
        throw new Error(`${this.name}: convert() not implemented`);
    }
}
