import UPNG from "upng-js";
import type { CapturedPixels } from "../../managers/voxlab/services/capture-service.js";

export interface ApngFrameAccumulator {
    push(frame: CapturedPixels, durationMs: number): void;
    finalize(width: number, height: number): Blob;
}

export function createApngAccumulator(): ApngFrameAccumulator {
    const frames: ArrayBuffer[] = [];
    const delays: number[] = [];
    return {
        push(frame, durationMs) {
            const buffer = new ArrayBuffer(frame.data.byteLength);
            new Uint8Array(buffer).set(new Uint8Array(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength));
            frames.push(buffer);
            delays.push(Math.max(1, Math.round(durationMs)));
        },
        finalize(width, height) {
            const encoded = UPNG.encode(frames, width, height, 0, delays);
            return new Blob([encoded], { type: "image/apng" });
        },
    };
}
