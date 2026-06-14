import sharp from "sharp";
import { ICON_BAKE_SIZE, type CustomizeTransform } from "./transform.js";

export const SHARP_READABLE_EXTS = new Set([".webp", ".png", ".jpg", ".svg"]);
const ICON_BAKE_RADIUS = 55;

export async function bakeCustomizedIcon(
    pristineBuffer: Buffer,
    transform: CustomizeTransform,
    outFormat: "webp" | "png",
): Promise<Buffer> {
    const sourceMeta = await sharp(pristineBuffer, { failOn: "none" }).metadata();
    const srcW = sourceMeta.width ?? ICON_BAKE_SIZE;
    const srcH = sourceMeta.height ?? ICON_BAKE_SIZE;
    const longer = Math.max(srcW, srcH);
    const factor = (ICON_BAKE_SIZE * transform.scale) / longer;
    const scaledW = Math.max(1, Math.round(srcW * factor));
    const scaledH = Math.max(1, Math.round(srcH * factor));
    const transformedBuffer = await sharp(pristineBuffer, { failOn: "none" })
        .resize(scaledW, scaledH, { fit: "fill" })
        .rotate(transform.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    const transformedMeta = await sharp(transformedBuffer).metadata();
    const tW = transformedMeta.width ?? scaledW;
    const tH = transformedMeta.height ?? scaledH;
    const rawLeft = Math.round((ICON_BAKE_SIZE - tW) / 2 + transform.translateX);
    const rawTop = Math.round((ICON_BAKE_SIZE - tH) / 2 + transform.translateY);

    const mask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_BAKE_SIZE}" height="${ICON_BAKE_SIZE}">` +
            `<rect x="0" y="0" width="${ICON_BAKE_SIZE}" height="${ICON_BAKE_SIZE}" rx="${ICON_BAKE_RADIUS}" ry="${ICON_BAKE_RADIUS}" fill="#fff"/>` +
            `</svg>`,
    );
    const base = sharp({
        create: {
            width: ICON_BAKE_SIZE,
            height: ICON_BAKE_SIZE,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    });

    // The transformed buffer can exceed the base canvas (scale > 1, or large
    // source images). sharp refuses to composite an overlay larger than the
    // base, so crop the transformed buffer to the visible region before
    // overlaying.
    const cropLeft = Math.max(0, -rawLeft);
    const cropTop = Math.max(0, -rawTop);
    const compositeLeft = Math.max(0, rawLeft);
    const compositeTop = Math.max(0, rawTop);
    const compositeWidth = Math.min(tW - cropLeft, ICON_BAKE_SIZE - compositeLeft);
    const compositeHeight = Math.min(tH - cropTop, ICON_BAKE_SIZE - compositeTop);
    const imageOverlaps = compositeWidth > 0 && compositeHeight > 0;
    const overlays: sharp.OverlayOptions[] = [];
    if (imageOverlaps) {
        const cropMatchesBuffer = cropLeft === 0 && cropTop === 0 && compositeWidth === tW && compositeHeight === tH;
        const overlayBuffer = cropMatchesBuffer
            ? transformedBuffer
            : await sharp(transformedBuffer)
                  .extract({ left: cropLeft, top: cropTop, width: compositeWidth, height: compositeHeight })
                  .toBuffer();
        overlays.push({ input: overlayBuffer, top: compositeTop, left: compositeLeft });
    }
    overlays.push({ input: mask, blend: "dest-in" });

    const composed = base.composite(overlays);
    if (outFormat === "webp") return composed.webp({ quality: 92, alphaQuality: 100 }).toBuffer();
    return composed.png({ compressionLevel: 9 }).toBuffer();
}
