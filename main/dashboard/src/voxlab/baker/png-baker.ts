import { Zip, ZipPassThrough } from "fflate";
import type { CapturedPixels } from "../../managers/voxlab/services/capture-service.js";

export interface PngSequenceAccumulator {
    push(frameIndex: number, frame: CapturedPixels): Promise<void>;
    finalize(): Promise<Blob>;
}

export function createPngSequenceAccumulator(): PngSequenceAccumulator {
    const chunks: Uint8Array[] = [];
    let finalized = false;
    const finishPromise = new Promise<Blob>((resolve, reject) => {
        const zip = new Zip((err, chunk, final) => {
            if (err) {
                reject(err);
                return;
            }
            chunks.push(chunk);
            if (final) {
                resolve(new Blob(chunks as BlobPart[], { type: "application/zip" }));
            }
        });
        accumulator.zip = zip;
        accumulator.resolveFinish = () => {
            if (!finalized) {
                finalized = true;
                zip.end();
            }
        };
        accumulator.rejectFinish = reject;
    });
    const accumulator: {
        zip: Zip | null;
        resolveFinish: (() => void) | null;
        rejectFinish: ((err: Error) => void) | null;
        finishPromise: Promise<Blob>;
    } = {
        zip: null,
        resolveFinish: null,
        rejectFinish: null,
        finishPromise,
    };

    return {
        async push(frameIndex, frame) {
            const blob = await pixelsToPngBlob(frame);
            const buffer = new Uint8Array(await blob.arrayBuffer());
            const fileName = `frame-${String(frameIndex).padStart(6, "0")}.png`;
            const file = new ZipPassThrough(fileName);
            if (!accumulator.zip) {
                throw new Error("PNG-sequence zip writer not initialised");
            }
            accumulator.zip.add(file);
            file.push(buffer, true);
        },
        finalize() {
            accumulator.resolveFinish?.();
            return accumulator.finishPromise;
        },
    };
}

async function pixelsToPngBlob(frame: CapturedPixels): Promise<Blob> {
    const canvas = createOff(frame.width, frame.height);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) {
        throw new Error("Failed to acquire 2D canvas context for PNG encoding");
    }
    ctx.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0);
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: "image/png" });
    }
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Failed to encode PNG frame"));
            }
        }, "image/png");
    });
}

function createOff(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
}
