import type { PbrMapSlot } from "../../types/voxlab/paint-types.js";

export const LUM_R = 0.299;
export const LUM_G = 0.587;
export const LUM_B = 0.114;
export const BYTE_MAX_PBR = 255;
export const NORMAL_ENCODE_BIAS = 0.5;
export const DEFAULT_SOBEL_STRENGTH = 1.0;
export const DEFAULT_METALNESS_THRESHOLD = 0.85;
export const DEFAULT_AO_RADIUS = 4;
export const RGBA_STRIDE_PBR = 4;
export const POSITION_X_OFFSET = 1;
export const POSITION_Y_OFFSET = 2;
export const POSITION_Z_OFFSET = 3;
export const SAMPLE_NEIGHBOR_OFFSET = 1;

export interface PbrGenerationChannels {
    normal: boolean;
    roughness: boolean;
    metalness: boolean;
    ao: boolean;
}

export const DEFAULT_PBR_GENERATION_CHANNELS: PbrGenerationChannels = {
    normal: true,
    roughness: true,
    metalness: false,
    ao: true,
};

export const SOBEL_STRENGTH_MIN = 0.1;
export const SOBEL_STRENGTH_MAX = 5;
export const SOBEL_STRENGTH_STEP = 0.1;
export const METALNESS_THRESHOLD_MIN = 0;
export const METALNESS_THRESHOLD_MAX = 1;
export const METALNESS_THRESHOLD_STEP = 0.05;
export const AO_RADIUS_MIN = 1;
export const AO_RADIUS_MAX = 16;
export const AO_RADIUS_STEP = 1;

export const ALL_PBR_SLOTS: ReadonlyArray<PbrMapSlot> = ["normal", "roughness", "metalness", "ao"];
