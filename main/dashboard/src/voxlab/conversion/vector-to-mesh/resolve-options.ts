import {
    DEFAULT_BACK_FACE,
    DEFAULT_BEZIER_TOLERANCE,
    DEFAULT_CORNER_ANGLE_DEGREES,
    DEFAULT_EXTRUSION_DEPTH,
    DEFAULT_NORMALIZE,
    DEFAULT_SMOOTHING_PASSES,
    DEFAULT_TAUBIN_LAMBDA,
    DEFAULT_TAUBIN_MU,
    DEFAULT_TAUBIN_ROUNDS,
    DEFAULT_VERTEX_COLOR,
    MAX_BEZIER_TOLERANCE,
    MAX_CORNER_ANGLE_DEGREES,
    MAX_EXTRUSION_DEPTH,
    MAX_SMOOTHING_PASSES,
    MAX_TAUBIN_LAMBDA,
    MAX_TAUBIN_MU,
    MAX_TAUBIN_ROUNDS,
    MIN_BEZIER_TOLERANCE,
    MIN_CORNER_ANGLE_DEGREES,
    MIN_EXTRUSION_DEPTH,
    MIN_SMOOTHING_PASSES,
    MIN_TAUBIN_LAMBDA,
    MIN_TAUBIN_MU,
    MIN_TAUBIN_ROUNDS,
} from "./constants/defaults.js";
import type { VectorToMeshOptions } from "./types.js";

export interface ResolvedOptions {
    bezierTolerance: number;
    extrusionDepth: number;
    smoothingPasses: number;
    taubinRounds: number;
    taubinLambda: number;
    taubinMu: number;
    cornerAngleDegrees: number;
    vertexColor: readonly [number, number, number];
    backFace: boolean;
    normalize: boolean;
}

interface NumericBounds {
    fallback: number;
    min: number;
    max: number;
}

const BOUNDS_TOLERANCE: NumericBounds = {
    fallback: DEFAULT_BEZIER_TOLERANCE,
    min: MIN_BEZIER_TOLERANCE,
    max: MAX_BEZIER_TOLERANCE,
};
const BOUNDS_DEPTH: NumericBounds = {
    fallback: DEFAULT_EXTRUSION_DEPTH,
    min: MIN_EXTRUSION_DEPTH,
    max: MAX_EXTRUSION_DEPTH,
};
const BOUNDS_SMOOTH: NumericBounds = {
    fallback: DEFAULT_SMOOTHING_PASSES,
    min: MIN_SMOOTHING_PASSES,
    max: MAX_SMOOTHING_PASSES,
};
const BOUNDS_TAUBIN: NumericBounds = {
    fallback: DEFAULT_TAUBIN_ROUNDS,
    min: MIN_TAUBIN_ROUNDS,
    max: MAX_TAUBIN_ROUNDS,
};
const BOUNDS_LAMBDA: NumericBounds = {
    fallback: DEFAULT_TAUBIN_LAMBDA,
    min: MIN_TAUBIN_LAMBDA,
    max: MAX_TAUBIN_LAMBDA,
};
const BOUNDS_MU: NumericBounds = { fallback: DEFAULT_TAUBIN_MU, min: MIN_TAUBIN_MU, max: MAX_TAUBIN_MU };
const BOUNDS_CORNER: NumericBounds = {
    fallback: DEFAULT_CORNER_ANGLE_DEGREES,
    min: MIN_CORNER_ANGLE_DEGREES,
    max: MAX_CORNER_ANGLE_DEGREES,
};

export function resolveOptions(options: VectorToMeshOptions): ResolvedOptions {
    return {
        bezierTolerance: clamp(options.bezierTolerance, BOUNDS_TOLERANCE),
        extrusionDepth: clamp(options.extrusionDepth, BOUNDS_DEPTH),
        smoothingPasses: clampInt(options.smoothingPasses, BOUNDS_SMOOTH),
        taubinRounds: clampInt(options.taubinRounds, BOUNDS_TAUBIN),
        taubinLambda: clamp(options.taubinLambda, BOUNDS_LAMBDA),
        taubinMu: clamp(options.taubinMu, BOUNDS_MU),
        cornerAngleDegrees: clamp(options.cornerAngleDegrees, BOUNDS_CORNER),
        vertexColor: options.vertexColor ?? DEFAULT_VERTEX_COLOR,
        backFace: options.backFace ?? DEFAULT_BACK_FACE,
        normalize: options.normalize ?? DEFAULT_NORMALIZE,
    };
}

function clamp(value: number | undefined, bounds: NumericBounds): number {
    if (value === undefined || !Number.isFinite(value)) return bounds.fallback;
    return Math.max(bounds.min, Math.min(bounds.max, value));
}

function clampInt(value: number | undefined, bounds: NumericBounds): number {
    return Math.floor(clamp(value, bounds));
}
