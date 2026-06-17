import { createApngAccumulator } from "../../voxlab/baker/apng-baker.js";
import { walkFrames, type FrameWalkerDeps } from "../../voxlab/baker/frame-walker.js";
import { createGifAccumulator } from "../../voxlab/baker/gif-baker.js";
import { createPngSequenceAccumulator } from "../../voxlab/baker/png-baker.js";
import type { CaptureService } from "./services/capture-service.js";
import type { TimelineManager } from "./timeline-manager.js";
import type { ViewportManager } from "./viewport-manager.js";

export type AnimationBakeFormat = "apng" | "gif" | "png-sequence";
export type FrameBakeFormat = "png" | "webp";

export interface BakeAnimationOptions {
    format: AnimationBakeFormat;
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    transparent: boolean;
    gifWorkerScript?: string;
}

export interface BakeFrameOptions {
    format: FrameBakeFormat;
    width: number;
    height: number;
    transparent: boolean;
}

export interface BakeResult {
    blob: Blob;
    suggestedExtension: string;
}

export interface BakerManagerDeps {
    timeline: TimelineManager;
    capture: CaptureService;
    viewport: ViewportManager;
}

export class BakerManager {
    constructor(private readonly deps: BakerManagerDeps) {}

    async bakeFrame(opts: BakeFrameOptions): Promise<BakeResult> {
        const blob = await this.deps.capture.captureFrame({
            width: opts.width,
            height: opts.height,
            format: opts.format,
            transparent: opts.transparent,
        });
        return { blob, suggestedExtension: opts.format };
    }

    async bakeAnimation(opts: BakeAnimationOptions): Promise<BakeResult> {
        if (!this.deps.timeline.hasTimeline()) {
            throw new Error("No timeline loaded");
        }
        const walkerDeps: FrameWalkerDeps = {
            viewport: this.deps.viewport,
            capture: this.deps.capture,
            timeline: this.deps.timeline,
        };
        const frameDelayMs = 1000 / opts.fps;

        if (opts.format === "apng") {
            const acc = createApngAccumulator();
            await walkFrames(walkerDeps, opts, (_idx, pixels) => {
                acc.push(pixels, frameDelayMs);
            });
            return { blob: acc.finalize(opts.width, opts.height), suggestedExtension: "apng" };
        }

        if (opts.format === "gif") {
            const acc = createGifAccumulator(opts.width, opts.height, opts.gifWorkerScript);
            await walkFrames(walkerDeps, opts, (_idx, pixels) => {
                acc.push(pixels, frameDelayMs);
            });
            return { blob: await acc.finalize(), suggestedExtension: "gif" };
        }

        const seqAcc = createPngSequenceAccumulator();
        await walkFrames(walkerDeps, opts, async (idx, pixels) => {
            await seqAcc.push(idx, pixels);
        });
        return { blob: await seqAcc.finalize(), suggestedExtension: "zip" };
    }
}
