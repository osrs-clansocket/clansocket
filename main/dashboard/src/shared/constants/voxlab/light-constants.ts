import type {
    BottomLightSettings,
    EnvironmentSettings,
    HemisphereSettings,
    LightSettings,
    RimLightSettings,
    TopLightSettings,
} from "../../types/voxlab/light-types.js";

export const DEFAULT_LIGHTING: LightSettings = {
    ambientIntensity: 0.45,
    keyIntensity: 1.1,
    keyPositionX: 2,
    keyPositionY: 3,
    keyPositionZ: 2.5,
    fillIntensity: 0.4,
    fillColor: "#f5ca7a",
    fillPositionX: -2.5,
    fillPositionY: -1,
    fillPositionZ: -2,
    shadowBias: -0.0005,
    shadowRadius: 4,
};

export const DEFAULT_ENVIRONMENT: EnvironmentSettings = {
    enabled: true,
    intensity: 1.0,
    hdrName: null,
};

export const DEFAULT_HEMISPHERE: HemisphereSettings = {
    skyColor: "#d8e6f2",
    groundColor: "#3a2d1a",
    intensity: 0.5,
};

export const DEFAULT_RIM_LIGHT: RimLightSettings = {
    intensity: 0.8,
    color: "#ffffff",
    positionX: -2.0,
    positionY: 1.5,
    positionZ: -3.0,
};

export const DEFAULT_TOP_LIGHT: TopLightSettings = {
    intensity: 0.6,
    color: "#ffffff",
};

export const DEFAULT_BOTTOM_LIGHT: BottomLightSettings = {
    intensity: 0.2,
    color: "#f5ca7a",
};

export const LIGHT_INTENSITY_MAX = 4;
export const LIGHT_POSITION_MIN = -10;
export const LIGHT_POSITION_MAX = 10;
export const SHADOW_BIAS_MIN = -0.01;
export const SHADOW_BIAS_MAX = 0.01;
export const SHADOW_RADIUS_MIN = 0;
export const SHADOW_RADIUS_MAX = 16;
export const ENV_INTENSITY_MAX = 3;

// Shadow camera + map sizing for the key DirectionalLight. Tuned for a single
// normalized hero mesh (~1 world unit) sitting near origin with the user's scale
// slider allowed up to a few multiples. Tighter frustum + larger map = higher
// effective texel density across the mesh = bias actually does its job.
export const SHADOW_MAP_SIZE = 2048;
export const SHADOW_CAMERA_HALF_EXTENT = 3;
export const SHADOW_CAMERA_NEAR = 0.1;
export const SHADOW_CAMERA_FAR = 20;
// Surface-normal-direction offset to keep grazing-angle faces (the extruded
// silhouette sides) from self-shadowing into noise. Pairs with the existing
// depth-space shadow.bias to handle both acne (too little offset) and peter
// panning (too much) at the same time.
export const DEFAULT_SHADOW_NORMAL_BIAS = 0.04;
