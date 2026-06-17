import type { CaptureService, CapturedPixels } from "../../managers/voxlab/services/capture-service.js";
import type { TimelineManager } from "../../managers/voxlab/timeline-manager.js";
import type { ViewportManager } from "../../managers/voxlab/viewport-manager.js";

export interface WalkOptions {
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    transparent: boolean;
}

export interface FrameWalkerDeps {
    viewport: ViewportManager;
    capture: CaptureService;
    timeline: TimelineManager;
}

export type FrameConsumer = (frameIndex: number, pixels: CapturedPixels, timeMs: number) => Promise<void> | void;

export async function walkFrames(deps: FrameWalkerDeps, opts: WalkOptions, onFrame: FrameConsumer): Promise<number> {
    const totalFrames = Math.max(1, Math.round((opts.durationMs / 1000) * opts.fps));
    deps.viewport.pauseTick();
    try {
        for (let n = 0; n < totalFrames; n++) {
            const timeMs = (n / opts.fps) * 1000;
            deps.timeline.seek(timeMs);
            await waitForRaf();
            const pixels = deps.capture.capturePixels(opts.width, opts.height, opts.transparent, timeMs);
            await onFrame(n, pixels, timeMs);
        }
    } finally {
        deps.viewport.resumeTick();
    }
    return totalFrames;
}

function waitForRaf(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
