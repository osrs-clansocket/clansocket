import type { InterpName, TrackType } from "../../shared/types/voxlab/timeline-types.js";

export type InterpolatorFn = (a: unknown, b: unknown, t: number) => unknown;

const numberInterp: InterpolatorFn = (a, b, t) => {
    const na = a as number;
    const nb = b as number;
    return na + (nb - na) * t;
};

const stepInterp: InterpolatorFn = (a, b, t) => (t < 1 ? a : b);

const colorInterp: InterpolatorFn = (a, b, t) => {
    const rgbA = hexToRgb(a as string);
    const rgbB = hexToRgb(b as string);
    if (!rgbA || !rgbB) {
        return t < 0.5 ? a : b;
    }
    const r = Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t);
    const g = Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t);
    const blue = Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t);
    return rgbToHex(r, g, blue);
};

const INTERP: Record<InterpName, InterpolatorFn> = {
    number: numberInterp,
    color: colorInterp,
    step: stepInterp,
};

const TYPE_DEFAULT_INTERP: Record<TrackType, InterpName> = {
    number: "number",
    color: "color",
    step: "step",
};

export function interpolate(
    type: TrackType,
    interpName: InterpName | undefined,
    a: unknown,
    b: unknown,
    t: number,
): unknown {
    const name = interpName ?? TYPE_DEFAULT_INTERP[type];
    const fn = INTERP[name] ?? stepInterp;
    return fn(a, b, t);
}

/**
 * Catmull-Rom sample across a 4-keyframe neighbourhood (p0, p1, p2, p3) at
 * parameter t ∈ [0,1] between p1 and p2. The tangent at each interior
 * keyframe = (next − previous) / 2, which guarantees C1 continuity across
 * adjacent segments — no velocity jump where two segments meet, so the
 * timeline flows smoothly through every keyframe rather than stopping/
 * restarting at each one.
 *
 * Step tracks (toggles / dropdowns) and explicit step interp stay piecewise.
 */
export function smoothInterpolate(
    type: TrackType,
    interpName: InterpName | undefined,
    p0: unknown,
    p1: unknown,
    p2: unknown,
    p3: unknown,
    t: number,
): unknown {
    const name = interpName ?? TYPE_DEFAULT_INTERP[type];
    if (name === "step" || type === "step") {
        return t < 1 ? p1 : p2;
    }
    if (type === "color") {
        const c0 = hexToRgb(p0 as string);
        const c1 = hexToRgb(p1 as string);
        const c2 = hexToRgb(p2 as string);
        const c3 = hexToRgb(p3 as string);
        if (!c0 || !c1 || !c2 || !c3) {
            // One of the values is malformed — fall back to the binary mix.
            return INTERP[name](p1, p2, t);
        }
        const r = clamp255(catmullRom(c0[0], c1[0], c2[0], c3[0], t));
        const g = clamp255(catmullRom(c0[1], c1[1], c2[1], c3[1], t));
        const b = clamp255(catmullRom(c0[2], c1[2], c2[2], c3[2], t));
        return rgbToHex(r, g, b);
    }
    return catmullRom(p0 as number, p1 as number, p2 as number, p3 as number, t);
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function clamp255(n: number): number {
    return Math.round(Math.max(0, Math.min(255, n)));
}

function hexToRgb(hex: string): [number, number, number] | null {
    if (typeof hex !== "string" || hex.length === 0) {
        return null;
    }
    const trimmed = hex.charAt(0) === "#" ? hex.slice(1) : hex;
    if (trimmed.length !== 6) {
        return null;
    }
    const r = Number.parseInt(trimmed.slice(0, 2), 16);
    const g = Number.parseInt(trimmed.slice(2, 4), 16);
    const b = Number.parseInt(trimmed.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        return null;
    }
    return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (n: number): number => Math.max(0, Math.min(255, n));
    const hex = (n: number): string => clamp(n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
}
