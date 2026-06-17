import type { EaseName } from "../../shared/types/voxlab/timeline-types.js";

export type EaseFn = (t: number) => number;

const linear: EaseFn = (t) => t;
const easeIn: EaseFn = (t) => t * t;
const easeOut: EaseFn = (t) => 1 - (1 - t) * (1 - t);
const easeInOut: EaseFn = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2);
const easeInCubic: EaseFn = (t) => t * t * t;
const easeOutCubic: EaseFn = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const easeInOutCubic: EaseFn = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2) * (-2 * t + 2)) / 2);

const EASINGS: Record<EaseName, EaseFn> = {
    linear,
    easeIn,
    easeOut,
    easeInOut,
    easeInCubic,
    easeOutCubic,
    easeInOutCubic,
};

export function applyEase(name: EaseName | undefined, t: number): number {
    const fn = EASINGS[name ?? "linear"] ?? linear;
    return fn(t);
}
