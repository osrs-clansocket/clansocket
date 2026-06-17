import type { ConvertOptions } from "../../types/voxlab/options-types.js";

export const DEFAULT_CONVERT_OPTIONS: ConvertOptions = {
    voxelResolution: 256,
    extrusionDepth: 0.18,
    smoothingPasses: 2,
    taubinRounds: 6,
    taubinLambda: 0.5,
    taubinMu: -0.53,
    cornerAngleDegrees: 5,
    alphaThreshold: 0.5,
    backFace: true,
    normalize: true,
    vertexColor: "#ffffff",
};

export const VOXEL_RESOLUTION_MIN = 16;
export const VOXEL_RESOLUTION_MAX = 2048;
export const VOXEL_RESOLUTION_STEP = 16;

export const EXTRUSION_DEPTH_MIN = 0;
export const EXTRUSION_DEPTH_MAX = 2;
export const EXTRUSION_DEPTH_STEP = 0.01;

export const SMOOTHING_PASSES_MIN = 0;
export const SMOOTHING_PASSES_MAX = 8;

export const ALPHA_THRESHOLD_MIN = 0;
export const ALPHA_THRESHOLD_MAX = 1;
export const ALPHA_THRESHOLD_STEP = 0.05;
