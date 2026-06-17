import type {
    BrushState,
    PaintSnapshotState,
    PartsPaintState,
    PartsSectionState,
} from "../../types/voxlab/paint-types.js";

export const DEFAULT_PAINT_COLOR = "#ffffff";

export const DEFAULT_PARTS_PAINT_STATE: PartsPaintState = {
    front: null,
    back: null,
    sides: null,
};

export const DEFAULT_PARTS_SECTION_STATE: PartsSectionState = {
    color: DEFAULT_PAINT_COLOR,
};

export const RGB_STRIDE = 3;

export const DEFAULT_BRUSH_RADIUS = 0.15;
export const BRUSH_RADIUS_MIN = 0.01;
export const BRUSH_RADIUS_MAX = 1.0;
export const BRUSH_RADIUS_STEP = 0.01;

export const DEFAULT_FALLOFF_SIGMA = 0.5;
export const FALLOFF_SIGMA_MIN = 0.1;
export const FALLOFF_SIGMA_MAX = 2.0;
export const FALLOFF_SIGMA_STEP = 0.05;

export const DEFAULT_BRUSH_OPACITY = 1.0;
export const BRUSH_OPACITY_MIN = 0.0;
export const BRUSH_OPACITY_MAX = 1.0;
export const BRUSH_OPACITY_STEP = 0.05;

export const DEFAULT_BRUSH_STATE: BrushState = {
    color: DEFAULT_PAINT_COLOR,
    radius: DEFAULT_BRUSH_RADIUS,
    falloffSigma: DEFAULT_FALLOFF_SIGMA,
    opacity: DEFAULT_BRUSH_OPACITY,
    mode: "paint",
    paintMode: false,
    eyedropper: false,
    mirrorX: false,
    mirrorY: false,
    mirrorZ: false,
    hideBackFaces: true,
};

export const DEFAULT_PAINT_SNAPSHOT_STATE: PaintSnapshotState = {
    parts: { ...DEFAULT_PARTS_PAINT_STATE },
    overrides: [],
};

export const HALVING_FACTOR = 2;

export const BRUSH_CURSOR_INNER_RADIUS_RATIO = 0.95;
export const BRUSH_CURSOR_OUTER_RADIUS_RATIO = 1.0;
export const BRUSH_CURSOR_SEGMENTS = 32;
export const BRUSH_CURSOR_OPACITY = 0.7;
export const BRUSH_CURSOR_COLOR_HEX = 0x00ffff;

export const MAX_STROKE_HISTORY = 50;

export const MAX_UPLOAD_TEXTURE_DIM = 2048;

export const BRUSH_GRID_CELL_SIZE = 0.15;

export const DEFAULT_GRADIENT_START_COLOR = "#ff0000";
export const DEFAULT_GRADIENT_END_COLOR = "#0000ff";

import type { GradientSpec } from "../../types/voxlab/paint-types.js";

export const DEFAULT_GRADIENT_SPEC: GradientSpec = {
    stops: [
        { color: DEFAULT_GRADIENT_START_COLOR, position: 0 },
        { color: DEFAULT_GRADIENT_END_COLOR, position: 1 },
    ],
    type: "linear",
    axis: "y",
    target: "all",
};

import type { AlbedoSettings } from "../../types/voxlab/paint-types.js";

export const DEFAULT_ALBEDO_SETTINGS: AlbedoSettings = {
    source: "none",
    uploadedDataUrl: null,
};

import type { PbrMapsSettings } from "../../types/voxlab/paint-types.js";

export const DEFAULT_PBR_MAPS_SETTINGS: PbrMapsSettings = {
    normal: null,
    roughness: null,
    metalness: null,
    ao: null,
    normalScale: 1,
    roughnessIntensity: 1,
    metalnessIntensity: 1,
    aoIntensity: 1,
};

export const PBR_NORMAL_SCALE_MIN = 0;
export const PBR_NORMAL_SCALE_MAX = 3;
export const PBR_NORMAL_SCALE_STEP = 0.05;
export const PBR_INTENSITY_MIN = 0;
export const PBR_INTENSITY_MAX = 2;
export const PBR_INTENSITY_STEP = 0.05;

export const PBR_SLOT_ORDER = ["normal", "roughness", "metalness", "ao"] as const;
