import GIF from "gif.js";
import type { CapturedPixels } from "../../managers/voxlab/services/capture-service.js";

const MAGENTA_TRANSPARENT_KEY = 0xff00ff;
const ALPHA_CUTOFF = 128;

export interface GifFrameAccumulator {
    push(frame: CapturedPixels, durationMs: number): void;
    finalize(): Promise<Blob>;
}

export function createGifAccumulator(width: number, height: number, workerScript?: string): GifFrameAccumulator {
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width,
        height,
        transparent: MAGENTA_TRANSPARENT_KEY,
        workerScript,
    });
    return {
        push(frame, durationMs) {
            const flattened = flattenAlphaToMagenta(frame.data);
            const image = new ImageData(flattened, frame.width, frame.height);
            gif.addFrame(image, { delay: Math.max(20, Math.round(durationMs)), copy: true });
        },
        finalize() {
            return new Promise<Blob>((resolve, reject) => {
                gif.on("finished", (blob) => resolve(blob));
                gif.on("abort", () => reject(new Error("GIF render aborted")));
                gif.render();
            });
        },
    };
}

function flattenAlphaToMagenta(data: Uint8ClampedArray<ArrayBuffer>): Uint8ClampedArray<ArrayBuffer> {
    const out = new Uint8ClampedArray(new ArrayBuffer(data.byteLength));
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < ALPHA_CUTOFF) {
            out[i] = 0xff;
            out[i + 1] = 0x00;
            out[i + 2] = 0xff;
            out[i + 3] = 0xff;
            continue;
        }
        out[i] = data[i];
        out[i + 1] = data[i + 1];
        out[i + 2] = data[i + 2];
        out[i + 3] = 0xff;
    }
    return out;
}
