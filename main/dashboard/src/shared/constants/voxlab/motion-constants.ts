import type { MotionSettings } from "../../types/voxlab/motion-types.js";

export const DEFAULT_MOTION: MotionSettings = {
    breatheEnabled: false,
    breatheAmplitude: 0.04,
    breathePeriodMs: 4000,
    bobEnabled: false,
    bobAmplitude: 0.05,
    bobPeriodMs: 5000,
    tiltEnabled: false,
    tiltStrength: 0.18,
};

export const BREATHE_AMPLITUDE_MAX = 0.2;
export const BOB_AMPLITUDE_MAX = 0.3;
export const TILT_STRENGTH_MAX = 0.6;
export const PERIOD_MIN_MS = 500;
export const PERIOD_MAX_MS = 12000;
export const PERIOD_STEP_MS = 100;

export const TILT_LERP = 0.06;
