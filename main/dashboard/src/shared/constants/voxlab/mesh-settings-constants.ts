import type { MeshSettings } from "../../types/voxlab/mesh-settings-types.js";

export const DEFAULT_MESH_SETTINGS: MeshSettings = {
    smoothingRounds: 4,
    cornerAngleDegrees: 5,
    scale: 1.0,
    normalize: true,
    vertexColor: "#ffffff",
    taubinLambda: 0.5,
    taubinMu: -0.53,
};

export const SMOOTHING_ROUNDS_MIN = 0;
export const SMOOTHING_ROUNDS_MAX = 12;
export const CORNER_ANGLE_MIN = 0;
export const CORNER_ANGLE_MAX = 90;
export const MESH_SCALE_MIN = 0.05;
export const MESH_SCALE_MAX = 5.0;
export const TAUBIN_LAMBDA_MIN = 0;
export const TAUBIN_LAMBDA_MAX = 1;
export const TAUBIN_MU_MIN = -1;
export const TAUBIN_MU_MAX = 0;
