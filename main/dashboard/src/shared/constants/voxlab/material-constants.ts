import type { MaterialSettings } from "../../types/voxlab/material-types.js";
import type { MaterialOption, MaterialVariant } from "../../types/voxlab/viewport-types.js";

export const MATERIAL_OPTIONS: readonly MaterialOption[] = [
    { value: "standard", label: "Standard (lit)" },
    { value: "normal", label: "Normals" },
    { value: "depth", label: "Depth" },
    { value: "basic", label: "Flat color" },
];

export const DEFAULT_MATERIAL: MaterialVariant = "standard";

export const STANDARD_METALNESS = 0.25;
export const STANDARD_ROUGHNESS = 0.55;
export const WIREFRAME_OPACITY = 0.35;
export const MERGE_VERTICES_TOLERANCE = 1e-5;

export const DEFAULT_MATERIAL_SETTINGS: MaterialSettings = {
    tint: "#ffffff",
    opacity: 1.0,
    metalness: STANDARD_METALNESS,
    roughness: STANDARD_ROUGHNESS,
    emissiveColor: "#000000",
    emissiveIntensity: 0,
    flatShading: true,
    clearcoat: 0,
    clearcoatRoughness: 0,
    ior: 1.5,
    sheen: 0,
    sheenColor: "#ffffff",
    anisotropy: 0,
};

export const CLEARCOAT_MIN = 0;
export const CLEARCOAT_MAX = 1;
export const CLEARCOAT_ROUGHNESS_MIN = 0;
export const CLEARCOAT_ROUGHNESS_MAX = 1;
export const IOR_MIN = 1;
export const IOR_MAX = 2.333;
export const SHEEN_MIN = 0;
export const SHEEN_MAX = 1;
export const ANISOTROPY_MIN = 0;
export const ANISOTROPY_MAX = 1;
