import type { ViewportManager } from "../viewport-manager.js";

export type CaptureFormat = "png" | "webp";

export interface CapturedPixels {
    width: number;
    height: number;
    data: Uint8ClampedArray<ArrayBuffer>;
}

export class CaptureService {
    constructor(private readonly viewport: ViewportManager) {}

    capturePixels(width: number, height: number, transparent: boolean, motionTimeMs?: number): CapturedPixels {
        // Render at supersample-scaled size, then downsample with the canvas
        // 2D context's bilinear filter. This gives capture/bake the same edge
        // quality the live view gets from the renderer's pixel ratio without
        // dragging an oversized framebuffer into the readback path.
        const ss = Math.max(1, this.viewport.supersample);
        const internalW = Math.max(1, Math.round(width * ss));
        const internalH = Math.max(1, Math.round(height * ss));

        const raw = this.viewport.captureFramePixels(internalW, internalH, transparent, motionTimeMs);
        const flipped = flipY(raw, internalW, internalH);

        if (internalW === width && internalH === height) {
            return { width, height, data: flipped };
        }
        return downsampleViaCanvas(flipped, internalW, internalH, width, height);
    }

    async captureFrame(opts: {
        width: number;
        height: number;
        format: CaptureFormat;
        transparent: boolean;
    }): Promise<Blob> {
        const { width, height, format, transparent } = opts;
        const pixels = this.capturePixels(width, height, transparent);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) {
            throw new Error("Failed to acquire 2D canvas context");
        }
        const image = new ImageData(pixels.data, width, height);
        ctx.putImageData(image, 0, 0);
        return canvasToBlob(canvas, format);
    }
}

function flipY(pixels: Uint8Array, width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
    const out = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
    const row = width * 4;
    for (let r = 0; r < height; r++) {
        const srcStart = r * row;
        const dstStart = (height - 1 - r) * row;
        out.set(pixels.subarray(srcStart, srcStart + row), dstStart);
    }
    return out;
}

function downsampleViaCanvas(
    src: Uint8ClampedArray,
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
): CapturedPixels {
    const srcCanvas = createCanvas(srcW, srcH);
    const srcCtx = srcCanvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!srcCtx) {
        throw new Error("Failed to acquire downsample source context");
    }
    // Allocate a tightly-typed Uint8ClampedArray<ArrayBuffer> for the
    // ImageData ctor (it refuses ArrayBufferLike unions in the lib types).
    const srcTyped = new Uint8ClampedArray(new ArrayBuffer(srcW * srcH * 4));
    srcTyped.set(src);
    const srcImage = new ImageData(srcTyped, srcW, srcH);
    srcCtx.putImageData(srcImage, 0, 0);

    const dstCanvas = createCanvas(dstW, dstH);
    const dstCtx = dstCanvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!dstCtx) {
        throw new Error("Failed to acquire downsample destination context");
    }
    dstCtx.imageSmoothingEnabled = true;
    dstCtx.imageSmoothingQuality = "high";
    // drawImage from the source canvas onto a smaller dest does a bilinear
    // downsample under the hood — this is what the live composer does
    // internally for supersample, applied here for the export path.
    dstCtx.drawImage(srcCanvas as unknown as CanvasImageSource, 0, 0, dstW, dstH);

    const dstImage = dstCtx.getImageData(0, 0, dstW, dstH);
    const data = new Uint8ClampedArray(new ArrayBuffer(dstW * dstH * 4));
    data.set(dstImage.data);
    return { width: dstW, height: dstH, data };
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
}

async function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, format: CaptureFormat): Promise<Blob> {
    const mime = format === "png" ? "image/png" : "image/webp";
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: mime });
    }
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error(`Failed to encode canvas to ${mime}`));
            }
        }, mime);
    });
}
