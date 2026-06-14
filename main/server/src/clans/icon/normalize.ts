import sharp from "sharp";

const ICON_RESIZE_LONGER_SIDE = 1024;
const RASTER_RESIZABLE_EXTS = new Set([".png", ".jpg", ".webp"]);

export async function normalizeUploadedIcon(buffer: Buffer, ext: string): Promise<Buffer> {
    if (!RASTER_RESIZABLE_EXTS.has(ext)) return buffer;
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const longer = Math.max(w, h);
    if (longer <= ICON_RESIZE_LONGER_SIDE) return buffer;
    const pipeline = sharp(buffer, { failOn: "none" }).resize({
        width: w >= h ? ICON_RESIZE_LONGER_SIDE : undefined,
        height: h > w ? ICON_RESIZE_LONGER_SIDE : undefined,
        fit: "inside",
        withoutEnlargement: true,
    });
    if (ext === ".webp") return pipeline.webp({ quality: 92, alphaQuality: 100 }).toBuffer();
    if (ext === ".jpg") return pipeline.jpeg({ quality: 90 }).toBuffer();
    return pipeline.png({ compressionLevel: 9 }).toBuffer();
}
