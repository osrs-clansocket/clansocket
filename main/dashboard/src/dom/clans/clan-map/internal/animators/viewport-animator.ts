import type { Signal } from "../../../../factory/reactive";
import type { AtlasBox } from "../../../../../shared/types/clan-map-view-types.js";

const DEFAULT_DURATION_MS = 200;
const EASE_OUT_POWER = 3;

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, EASE_OUT_POWER);
}

function sameViewport(a: AtlasBox, b: AtlasBox): boolean {
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export interface ViewportAnimator {
    start(to: AtlasBox, durationMs?: number): void;
    cancel(): void;
}

export function makeViewportAnimator(viewport$: Signal<AtlasBox>, clamp: (vp: AtlasBox) => AtlasBox): ViewportAnimator {
    let rafId = 0;
    let lastWrite: AtlasBox | null = null;

    const cancel = (): void => {
        if (rafId !== 0) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
        lastWrite = null;
    };

    const start = (to: AtlasBox, durationMs: number = DEFAULT_DURATION_MS): void => {
        cancel();
        const from = viewport$();
        const startTime = performance.now();
        const step = (now: number): void => {
            const cur = viewport$();
            if (lastWrite !== null && !sameViewport(cur, lastWrite)) {
                rafId = 0;
                lastWrite = null;
                return;
            }
            const t = Math.min(1, (now - startTime) / durationMs);
            const eased = easeOutCubic(t);
            const interp = clamp({
                x: from.x + (to.x - from.x) * eased,
                y: from.y + (to.y - from.y) * eased,
                w: from.w + (to.w - from.w) * eased,
                h: from.h + (to.h - from.h) * eased,
            });
            viewport$.set(interp);
            lastWrite = interp;
            if (t < 1) {
                rafId = window.requestAnimationFrame(step);
            } else {
                rafId = 0;
                lastWrite = null;
            }
        };
        rafId = window.requestAnimationFrame(step);
    };

    return { start, cancel };
}
