export const CANVAS_PX = 256;
export const CANVAS_CENTER = CANVAS_PX / 2;
export const CANVAS_MASK_RADIUS = 55;
export const SCALE_MIN = 0.25;
export const SCALE_MAX = 3;
export const SCALE_STEP = 0.01;
export const HALF_TURN_DEG = 180;
export const ROTATE_MIN = -HALF_TURN_DEG;
export const ROTATE_MAX = HALF_TURN_DEG;
export const ROTATE_STEP = 1;
export const TRANSLATE_MAX = CANVAS_PX;
export const TRANSLATE_STEP = 1;
export const DEGREES_TO_RAD = Math.PI / HALF_TURN_DEG;
export const CHECKER_TILE_PX = 16;
export const CHECKER_FALLBACK_A = "#1c2433";
export const CHECKER_FALLBACK_B = "#272e3e";

export function clamp(n: number, min: number, max: number): number {
    if (n < min) return min;
    if (n > max) return max;
    return n;
}
