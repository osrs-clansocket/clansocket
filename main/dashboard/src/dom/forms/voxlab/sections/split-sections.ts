import { pathColor, pathNumber, pathStep } from "../../../../state/voxlab/registries/snapshot-registry.js";
import {
    AXES_LENGTH_MAX,
    AXES_LENGTH_MIN,
    BLOOM_RADIUS_MAX,
    BLOOM_STRENGTH_MAX,
    BLOOM_THRESHOLD_MAX,
    CHROMATIC_ABERRATION_AMOUNT_MAX,
    CHROMATIC_ABERRATION_AMOUNT_MIN,
    COLOR_SPACE_OPTIONS,
    CONTRAST_AMOUNT_MAX,
    CONTRAST_AMOUNT_MIN,
    DEFAULT_EFFECTS,
    EXPOSURE_MAX,
    EXPOSURE_MIN,
    EXPOSURE_STEP,
    GRID_DIVISIONS_MAX,
    GRID_DIVISIONS_MIN,
    GRID_FLOOR_Y_MAX,
    GRID_FLOOR_Y_MIN,
    GRID_SIZE_MAX,
    GRID_SIZE_MIN,
    MSAA_SAMPLES_MAX,
    MSAA_SAMPLES_MIN,
    MSAA_SAMPLES_STEP,
    OUTLINE_THICKNESS_MAX,
    PIXEL_RATIO_MAX,
    PIXEL_RATIO_MIN,
    PIXEL_RATIO_STEP,
    SUPERSAMPLE_MAX,
    SUPERSAMPLE_MIN,
    SUPERSAMPLE_STEP,
    TONE_MAPPING_OPTIONS,
    VIGNETTE_AMOUNT_MAX,
    VIGNETTE_AMOUNT_MIN,
    type ColorSpaceMode,
} from "../../../../shared/constants/voxlab/effect-constants.js";
import {
    ANISOTROPY_MAX,
    ANISOTROPY_MIN,
    CLEARCOAT_MAX,
    CLEARCOAT_MIN,
    CLEARCOAT_ROUGHNESS_MAX,
    CLEARCOAT_ROUGHNESS_MIN,
    DEFAULT_MATERIAL_SETTINGS,
    IOR_MAX,
    IOR_MIN,
    SHEEN_MAX,
    SHEEN_MIN,
} from "../../../../shared/constants/voxlab/material-constants.js";
import {
    DEFAULT_BOTTOM_LIGHT,
    DEFAULT_ENVIRONMENT,
    DEFAULT_HEMISPHERE,
    DEFAULT_LIGHTING,
    DEFAULT_RIM_LIGHT,
    DEFAULT_TOP_LIGHT,
    ENV_INTENSITY_MAX,
    LIGHT_INTENSITY_MAX,
    LIGHT_POSITION_MAX,
    LIGHT_POSITION_MIN,
    SHADOW_BIAS_MAX,
    SHADOW_BIAS_MIN,
    SHADOW_RADIUS_MAX,
    SHADOW_RADIUS_MIN,
} from "../../../../shared/constants/voxlab/light-constants.js";
import type { EffectsSettings } from "../../../../shared/types/voxlab/effects-types.js";
import type {
    BottomLightSettings,
    EnvironmentSettings,
    HemisphereSettings,
    LightSettings,
    RimLightSettings,
    TopLightSettings,
} from "../../../../shared/types/voxlab/light-types.js";
import type { MaterialSettings } from "../../../../shared/types/voxlab/material-types.js";
import type { StressSettings } from "../../../../shared/types/voxlab/stress-types.js";
import { SectionComponent, type SectionField } from "../panels/section-component.js";

const DEFAULT_STRESS: StressSettings = { enabled: false, radius: 0.6, lerp: 0.14, glowColor: "#f5ca7a" };

export interface WireframeFields {
    enabled: boolean;
    color: string;
    opacity: number;
}

export interface ShadingFields {
    smoothShading: boolean;
    flatShading: boolean;
}

export interface ShadowsFields {
    enabled: boolean;
}

export interface GridAxesFields {
    gridEnabled: boolean;
    gridColor: string;
    gridSize: number;
    gridDivisions: number;
    gridFloorY: number;
    axesLength: number;
}

export interface PixelRatioFields {
    pixelRatio: number;
}

export interface TargetFpsFields {
    targetFps: number;
}

export interface ColorSpaceFields {
    colorSpace: ColorSpaceMode;
}

const DEFAULT_WIREFRAME: WireframeFields = { enabled: false, color: "#f5ca7a", opacity: 0.35 };
const DEFAULT_SHADING: ShadingFields = { smoothShading: false, flatShading: true };
const DEFAULT_SHADOWS: ShadowsFields = { enabled: false };
const DEFAULT_GRID_AXES: GridAxesFields = {
    gridEnabled: true,
    gridColor: DEFAULT_EFFECTS.gridColor,
    gridSize: DEFAULT_EFFECTS.gridSize,
    gridDivisions: DEFAULT_EFFECTS.gridDivisions,
    gridFloorY: DEFAULT_EFFECTS.gridFloorY,
    axesLength: DEFAULT_EFFECTS.axesLength,
};
const DEFAULT_PIXEL_RATIO: PixelRatioFields = { pixelRatio: 2 };
const DEFAULT_COLOR_SPACE: ColorSpaceFields = { colorSpace: "srgb" };

export type SurfaceFields = Pick<MaterialSettings, "tint" | "opacity" | "metalness" | "roughness">;
export type EmissiveFields = Pick<MaterialSettings, "emissiveColor" | "emissiveIntensity">;
export type CoatSheenFields = Pick<
    MaterialSettings,
    "clearcoat" | "clearcoatRoughness" | "ior" | "sheen" | "sheenColor" | "anisotropy"
>;
export type AmbientFields = Pick<LightSettings, "ambientIntensity">;
export type KeyLightFields = Pick<
    LightSettings,
    "keyIntensity" | "keyPositionX" | "keyPositionY" | "keyPositionZ" | "shadowBias" | "shadowRadius"
>;
export type FillLightFields = Pick<
    LightSettings,
    "fillIntensity" | "fillColor" | "fillPositionX" | "fillPositionY" | "fillPositionZ"
>;
export type BackgroundFields = Pick<EffectsSettings, "backgroundColor">;
export type ToneExposureFields = Pick<EffectsSettings, "toneMapping" | "exposure">;
export type BloomFields = Pick<EffectsSettings, "bloomEnabled" | "bloomStrength" | "bloomRadius" | "bloomThreshold">;
export type OutlineFields = Pick<EffectsSettings, "outlineEnabled" | "outlineColor" | "outlineThickness">;
export type VignetteFields = Pick<EffectsSettings, "vignetteEnabled" | "vignetteAmount" | "vignetteColor">;
export type ContrastFields = Pick<EffectsSettings, "contrastEnabled" | "contrastAmount">;
export type ChromaticAberrationFields = Pick<
    EffectsSettings,
    "chromaticAberrationEnabled" | "chromaticAberrationAmount"
>;
export type QualityFields = Pick<EffectsSettings, "fxaaEnabled" | "msaaSamples" | "supersample">;

const intoSurface = (s: SurfaceFields): SurfaceFields => s;
const intoEmissive = (s: EmissiveFields): EmissiveFields => s;
const intoCoatSheen = (s: CoatSheenFields): CoatSheenFields => s;
const intoAmbient = (s: AmbientFields): AmbientFields => s;
const intoKeyLight = (s: KeyLightFields): KeyLightFields => s;
const intoFillLight = (s: FillLightFields): FillLightFields => s;
const intoBackground = (s: BackgroundFields): BackgroundFields => s;
const intoToneExposure = (s: ToneExposureFields): ToneExposureFields => s;
const intoBloom = (s: BloomFields): BloomFields => s;
const intoOutline = (s: OutlineFields): OutlineFields => s;
const intoVignette = (s: VignetteFields): VignetteFields => s;
const intoContrast = (s: ContrastFields): ContrastFields => s;
const intoChromaticAberration = (s: ChromaticAberrationFields): ChromaticAberrationFields => s;
const intoQuality = (s: QualityFields): QualityFields => s;
const intoStress = (s: StressSettings): StressSettings => s;

// The into* helpers keep TS happy when listing snapshot paths inline below.
void intoSurface;
void intoEmissive;
void intoCoatSheen;
void intoAmbient;
void intoKeyLight;
void intoFillLight;
void intoBackground;
void intoToneExposure;
void intoBloom;
void intoOutline;
void intoVignette;
void intoContrast;
void intoChromaticAberration;
void intoQuality;
void intoStress;

export function createSurfaceSection(): SectionComponent<SurfaceFields> {
    const fields: ReadonlyArray<SectionField<SurfaceFields>> = [
        { type: "color", key: "tint", label: "Tint", snapshotPath: pathColor("tint", "tint") },
        {
            type: "slider",
            key: "opacity",
            label: "Opacity",
            min: 0,
            max: 1,
            step: 0.01,
            snapshotPath: pathNumber("opacity", "opacity"),
        },
        {
            type: "slider",
            key: "metalness",
            label: "Metalness",
            min: 0,
            max: 1,
            step: 0.01,
            snapshotPath: pathNumber("metalness", "metalness"),
        },
        {
            type: "slider",
            key: "roughness",
            label: "Roughness",
            min: 0,
            max: 1,
            step: 0.01,
            snapshotPath: pathNumber("roughness", "roughness"),
        },
    ];
    return new SectionComponent<SurfaceFields>({
        snapshotName: "surface",
        title: "Surface",
        eventName: "surface-change",
        defaults: pick(DEFAULT_MATERIAL_SETTINGS, ["tint", "opacity", "metalness", "roughness"]),
        fields,
    });
}

export function createEmissiveSection(): SectionComponent<EmissiveFields> {
    const fields: ReadonlyArray<SectionField<EmissiveFields>> = [
        {
            type: "color",
            key: "emissiveColor",
            label: "Color",
            snapshotPath: pathColor("emissiveColor", "emissiveColor"),
        },
        {
            type: "slider",
            key: "emissiveIntensity",
            label: "Intensity",
            min: 0,
            max: 3,
            step: 0.05,
            snapshotPath: pathNumber("emissiveIntensity", "emissiveIntensity"),
        },
    ];
    return new SectionComponent<EmissiveFields>({
        snapshotName: "emissive",
        title: "Emissive",
        eventName: "emissive-change",
        defaults: pick(DEFAULT_MATERIAL_SETTINGS, ["emissiveColor", "emissiveIntensity"]),
        fields,
    });
}

export function createCoatSheenSection(): SectionComponent<CoatSheenFields> {
    const fields: ReadonlyArray<SectionField<CoatSheenFields>> = [
        {
            type: "slider",
            key: "clearcoat",
            label: "Clearcoat",
            min: CLEARCOAT_MIN,
            max: CLEARCOAT_MAX,
            step: 0.01,
            snapshotPath: pathNumber("clearcoat", "clearcoat"),
        },
        {
            type: "slider",
            key: "clearcoatRoughness",
            label: "Clearcoat roughness",
            min: CLEARCOAT_ROUGHNESS_MIN,
            max: CLEARCOAT_ROUGHNESS_MAX,
            step: 0.01,
            snapshotPath: pathNumber("clearcoatRoughness", "clearcoatRoughness"),
        },
        {
            type: "slider",
            key: "ior",
            label: "IOR",
            min: IOR_MIN,
            max: IOR_MAX,
            step: 0.01,
            snapshotPath: pathNumber("ior", "ior"),
        },
        {
            type: "slider",
            key: "sheen",
            label: "Sheen",
            min: SHEEN_MIN,
            max: SHEEN_MAX,
            step: 0.01,
            snapshotPath: pathNumber("sheen", "sheen"),
        },
        { type: "color", key: "sheenColor", label: "Sheen color", snapshotPath: pathColor("sheenColor", "sheenColor") },
        {
            type: "slider",
            key: "anisotropy",
            label: "Anisotropy",
            min: ANISOTROPY_MIN,
            max: ANISOTROPY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("anisotropy", "anisotropy"),
        },
    ];
    return new SectionComponent<CoatSheenFields>({
        snapshotName: "coatSheen",
        title: "Coat & Sheen",
        eventName: "coat-sheen-change",
        defaults: pick(DEFAULT_MATERIAL_SETTINGS, [
            "clearcoat",
            "clearcoatRoughness",
            "ior",
            "sheen",
            "sheenColor",
            "anisotropy",
        ]),
        fields,
    });
}

export function createWireframeSection(): SectionComponent<WireframeFields> {
    const fields: ReadonlyArray<SectionField<WireframeFields>> = [
        { type: "toggle", key: "enabled", label: "Wireframe overlay", snapshotPath: pathStep("enabled", "enabled") },
        { type: "color", key: "color", label: "Color", snapshotPath: pathColor("color", "color") },
        {
            type: "slider",
            key: "opacity",
            label: "Opacity",
            min: 0,
            max: 1,
            step: 0.01,
            snapshotPath: pathNumber("opacity", "opacity"),
        },
    ];
    return new SectionComponent<WireframeFields>({
        snapshotName: "wireframe",
        title: "Wireframe",
        eventName: "wireframe-change",
        defaults: { ...DEFAULT_WIREFRAME },
        fields,
    });
}

export function createShadingSection(): SectionComponent<ShadingFields> {
    const fields: ReadonlyArray<SectionField<ShadingFields>> = [
        {
            type: "toggle",
            key: "smoothShading",
            label: "Smooth shading",
            snapshotPath: pathStep("smoothShading", "smoothShading"),
        },
        {
            type: "toggle",
            key: "flatShading",
            label: "Flat shading",
            snapshotPath: pathStep("flatShading", "flatShading"),
        },
    ];
    return new SectionComponent<ShadingFields>({
        snapshotName: "shading",
        title: "Shading",
        eventName: "shading-change",
        defaults: { ...DEFAULT_SHADING },
        fields,
    });
}

export function createShadowsSection(): SectionComponent<ShadowsFields> {
    const fields: ReadonlyArray<SectionField<ShadowsFields>> = [
        { type: "toggle", key: "enabled", label: "Cast shadows", snapshotPath: pathStep("enabled", "enabled") },
    ];
    return new SectionComponent<ShadowsFields>({
        snapshotName: "shadows",
        title: "Shadows",
        eventName: "shadows-change",
        defaults: { ...DEFAULT_SHADOWS },
        fields,
    });
}

export function createAmbientSection(): SectionComponent<AmbientFields> {
    const fields: ReadonlyArray<SectionField<AmbientFields>> = [
        {
            type: "slider",
            key: "ambientIntensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("ambientIntensity", "ambientIntensity"),
        },
    ];
    return new SectionComponent<AmbientFields>({
        snapshotName: "ambient",
        title: "Ambient",
        eventName: "ambient-change",
        defaults: pick(DEFAULT_LIGHTING, ["ambientIntensity"]),
        fields,
    });
}

export function createKeyLightSection(): SectionComponent<KeyLightFields> {
    const fields: ReadonlyArray<SectionField<KeyLightFields>> = [
        {
            type: "slider",
            key: "keyIntensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("keyIntensity", "keyIntensity"),
        },
        {
            type: "slider",
            key: "keyPositionX",
            label: "Position X",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("keyPositionX", "keyPositionX"),
        },
        {
            type: "slider",
            key: "keyPositionY",
            label: "Position Y",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("keyPositionY", "keyPositionY"),
        },
        {
            type: "slider",
            key: "keyPositionZ",
            label: "Position Z",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("keyPositionZ", "keyPositionZ"),
        },
        {
            type: "slider",
            key: "shadowBias",
            label: "Shadow bias",
            min: SHADOW_BIAS_MIN,
            max: SHADOW_BIAS_MAX,
            step: 0.0001,
            formatValue: (n) => n.toFixed(4),
            snapshotPath: pathNumber("shadowBias", "shadowBias"),
        },
        {
            type: "slider",
            key: "shadowRadius",
            label: "Shadow softness",
            min: SHADOW_RADIUS_MIN,
            max: SHADOW_RADIUS_MAX,
            step: 0.1,
            snapshotPath: pathNumber("shadowRadius", "shadowRadius"),
        },
    ];
    return new SectionComponent<KeyLightFields>({
        snapshotName: "keyLight",
        title: "Key Light",
        eventName: "key-light-change",
        defaults: pick(DEFAULT_LIGHTING, [
            "keyIntensity",
            "keyPositionX",
            "keyPositionY",
            "keyPositionZ",
            "shadowBias",
            "shadowRadius",
        ]),
        fields,
    });
}

export function createFillLightSection(): SectionComponent<FillLightFields> {
    const fields: ReadonlyArray<SectionField<FillLightFields>> = [
        {
            type: "slider",
            key: "fillIntensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("fillIntensity", "fillIntensity"),
        },
        { type: "color", key: "fillColor", label: "Color", snapshotPath: pathColor("fillColor", "fillColor") },
        {
            type: "slider",
            key: "fillPositionX",
            label: "Position X",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("fillPositionX", "fillPositionX"),
        },
        {
            type: "slider",
            key: "fillPositionY",
            label: "Position Y",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("fillPositionY", "fillPositionY"),
        },
        {
            type: "slider",
            key: "fillPositionZ",
            label: "Position Z",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("fillPositionZ", "fillPositionZ"),
        },
    ];
    return new SectionComponent<FillLightFields>({
        snapshotName: "fillLight",
        title: "Fill Light",
        eventName: "fill-light-change",
        defaults: pick(DEFAULT_LIGHTING, [
            "fillIntensity",
            "fillColor",
            "fillPositionX",
            "fillPositionY",
            "fillPositionZ",
        ]),
        fields,
    });
}

export function createBackgroundSection(): SectionComponent<BackgroundFields> {
    const fields: ReadonlyArray<SectionField<BackgroundFields>> = [
        {
            type: "color",
            key: "backgroundColor",
            label: "Background",
            snapshotPath: pathColor("backgroundColor", "backgroundColor"),
        },
    ];
    return new SectionComponent<BackgroundFields>({
        snapshotName: "background",
        title: "Background",
        eventName: "background-change",
        defaults: pick(DEFAULT_EFFECTS, ["backgroundColor"]),
        fields,
    });
}

export function createToneExposureSection(): SectionComponent<ToneExposureFields> {
    const fields: ReadonlyArray<SectionField<ToneExposureFields>> = [
        {
            type: "dropdown",
            key: "toneMapping",
            options: TONE_MAPPING_OPTIONS,
            snapshotPath: pathStep("toneMapping", "toneMapping"),
        },
        {
            type: "slider",
            key: "exposure",
            label: "Exposure",
            min: EXPOSURE_MIN,
            max: EXPOSURE_MAX,
            step: EXPOSURE_STEP,
            snapshotPath: pathNumber("exposure", "exposure"),
        },
    ];
    return new SectionComponent<ToneExposureFields>({
        snapshotName: "toneExposure",
        title: "Tone & Exposure",
        eventName: "tone-exposure-change",
        defaults: pick(DEFAULT_EFFECTS, ["toneMapping", "exposure"]),
        fields,
    });
}

export function createGridAxesSection(): SectionComponent<GridAxesFields> {
    const fields: ReadonlyArray<SectionField<GridAxesFields>> = [
        {
            type: "toggle",
            key: "gridEnabled",
            label: "Show grid",
            snapshotPath: pathStep("gridEnabled", "gridEnabled"),
        },
        { type: "color", key: "gridColor", label: "Grid color", snapshotPath: pathColor("gridColor", "gridColor") },
        {
            type: "slider",
            key: "gridSize",
            label: "Grid size",
            min: GRID_SIZE_MIN,
            max: GRID_SIZE_MAX,
            step: 0.5,
            snapshotPath: pathNumber("gridSize", "gridSize"),
        },
        {
            type: "slider",
            key: "gridDivisions",
            label: "Grid divisions",
            min: GRID_DIVISIONS_MIN,
            max: GRID_DIVISIONS_MAX,
            step: 1,
            formatValue: (n) => `${Math.round(n)}`,
            snapshotPath: pathNumber("gridDivisions", "gridDivisions"),
        },
        {
            type: "slider",
            key: "gridFloorY",
            label: "Grid floor Y",
            min: GRID_FLOOR_Y_MIN,
            max: GRID_FLOOR_Y_MAX,
            step: 0.05,
            snapshotPath: pathNumber("gridFloorY", "gridFloorY"),
        },
        {
            type: "slider",
            key: "axesLength",
            label: "Axes length",
            min: AXES_LENGTH_MIN,
            max: AXES_LENGTH_MAX,
            step: 0.05,
            snapshotPath: pathNumber("axesLength", "axesLength"),
        },
    ];
    return new SectionComponent<GridAxesFields>({
        snapshotName: "gridAxes",
        title: "Grid & Axes",
        eventName: "grid-axes-change",
        defaults: { ...DEFAULT_GRID_AXES },
        fields,
    });
}

export function createBloomSection(): SectionComponent<BloomFields> {
    const fields: ReadonlyArray<SectionField<BloomFields>> = [
        { type: "toggle", key: "bloomEnabled", label: "Bloom", snapshotPath: pathStep("bloomEnabled", "bloomEnabled") },
        {
            type: "slider",
            key: "bloomStrength",
            label: "Strength",
            min: 0,
            max: BLOOM_STRENGTH_MAX,
            step: 0.05,
            snapshotPath: pathNumber("bloomStrength", "bloomStrength"),
        },
        {
            type: "slider",
            key: "bloomRadius",
            label: "Radius",
            min: 0,
            max: BLOOM_RADIUS_MAX,
            step: 0.01,
            snapshotPath: pathNumber("bloomRadius", "bloomRadius"),
        },
        {
            type: "slider",
            key: "bloomThreshold",
            label: "Threshold",
            min: 0,
            max: BLOOM_THRESHOLD_MAX,
            step: 0.01,
            snapshotPath: pathNumber("bloomThreshold", "bloomThreshold"),
        },
    ];
    return new SectionComponent<BloomFields>({
        snapshotName: "bloom",
        title: "Bloom",
        eventName: "bloom-change",
        defaults: pick(DEFAULT_EFFECTS, ["bloomEnabled", "bloomStrength", "bloomRadius", "bloomThreshold"]),
        fields,
    });
}

export function createOutlineSection(): SectionComponent<OutlineFields> {
    const fields: ReadonlyArray<SectionField<OutlineFields>> = [
        {
            type: "toggle",
            key: "outlineEnabled",
            label: "Outline",
            snapshotPath: pathStep("outlineEnabled", "outlineEnabled"),
        },
        { type: "color", key: "outlineColor", label: "Color", snapshotPath: pathColor("outlineColor", "outlineColor") },
        {
            type: "slider",
            key: "outlineThickness",
            label: "Thickness",
            min: 0,
            max: OUTLINE_THICKNESS_MAX,
            step: 0.1,
            snapshotPath: pathNumber("outlineThickness", "outlineThickness"),
        },
    ];
    return new SectionComponent<OutlineFields>({
        snapshotName: "outline",
        title: "Outline",
        eventName: "outline-change",
        defaults: pick(DEFAULT_EFFECTS, ["outlineEnabled", "outlineColor", "outlineThickness"]),
        fields,
    });
}

export function createVignetteSection(): SectionComponent<VignetteFields> {
    const fields: ReadonlyArray<SectionField<VignetteFields>> = [
        {
            type: "toggle",
            key: "vignetteEnabled",
            label: "Vignette",
            snapshotPath: pathStep("vignetteEnabled", "vignetteEnabled"),
        },
        {
            type: "slider",
            key: "vignetteAmount",
            label: "Amount",
            min: VIGNETTE_AMOUNT_MIN,
            max: VIGNETTE_AMOUNT_MAX,
            step: 0.01,
            snapshotPath: pathNumber("vignetteAmount", "vignetteAmount"),
        },
        {
            type: "color",
            key: "vignetteColor",
            label: "Color",
            snapshotPath: pathColor("vignetteColor", "vignetteColor"),
        },
    ];
    return new SectionComponent<VignetteFields>({
        snapshotName: "vignette",
        title: "Vignette",
        eventName: "vignette-change",
        defaults: pick(DEFAULT_EFFECTS, ["vignetteEnabled", "vignetteAmount", "vignetteColor"]),
        fields,
    });
}

export function createContrastSection(): SectionComponent<ContrastFields> {
    const fields: ReadonlyArray<SectionField<ContrastFields>> = [
        {
            type: "toggle",
            key: "contrastEnabled",
            label: "Contrast",
            snapshotPath: pathStep("contrastEnabled", "contrastEnabled"),
        },
        {
            type: "slider",
            key: "contrastAmount",
            label: "Amount",
            min: CONTRAST_AMOUNT_MIN,
            max: CONTRAST_AMOUNT_MAX,
            step: 0.01,
            snapshotPath: pathNumber("contrastAmount", "contrastAmount"),
        },
    ];
    return new SectionComponent<ContrastFields>({
        snapshotName: "contrast",
        title: "Contrast",
        eventName: "contrast-change",
        defaults: pick(DEFAULT_EFFECTS, ["contrastEnabled", "contrastAmount"]),
        fields,
    });
}

export function createChromaticAberrationSection(): SectionComponent<ChromaticAberrationFields> {
    const fields: ReadonlyArray<SectionField<ChromaticAberrationFields>> = [
        {
            type: "toggle",
            key: "chromaticAberrationEnabled",
            label: "Chromatic aberration",
            snapshotPath: pathStep("chromaticAberrationEnabled", "chromaticAberrationEnabled"),
        },
        {
            type: "slider",
            key: "chromaticAberrationAmount",
            label: "Amount",
            min: CHROMATIC_ABERRATION_AMOUNT_MIN,
            max: CHROMATIC_ABERRATION_AMOUNT_MAX,
            step: 0.01,
            snapshotPath: pathNumber("chromaticAberrationAmount", "chromaticAberrationAmount"),
        },
    ];
    return new SectionComponent<ChromaticAberrationFields>({
        snapshotName: "chromaticAberration",
        title: "Chromatic Aberration",
        eventName: "chromatic-aberration-change",
        defaults: pick(DEFAULT_EFFECTS, ["chromaticAberrationEnabled", "chromaticAberrationAmount"]),
        fields,
    });
}

export function createQualitySection(): SectionComponent<QualityFields> {
    const fields: ReadonlyArray<SectionField<QualityFields>> = [
        { type: "toggle", key: "fxaaEnabled", label: "FXAA", snapshotPath: pathStep("fxaaEnabled", "fxaaEnabled") },
        {
            type: "slider",
            key: "msaaSamples",
            label: "MSAA",
            min: MSAA_SAMPLES_MIN,
            max: MSAA_SAMPLES_MAX,
            step: MSAA_SAMPLES_STEP,
            formatValue: (n) => (n <= 0 ? "off" : `${Math.round(n)}×`),
            snapshotPath: pathNumber("msaaSamples", "msaaSamples"),
        },
        {
            type: "slider",
            key: "supersample",
            label: "Supersample",
            min: SUPERSAMPLE_MIN,
            max: SUPERSAMPLE_MAX,
            step: SUPERSAMPLE_STEP,
            formatValue: (n) => `${n.toFixed(2)}×`,
            snapshotPath: pathNumber("supersample", "supersample"),
        },
    ];
    return new SectionComponent<QualityFields>({
        snapshotName: "quality",
        title: "Quality",
        eventName: "quality-change",
        defaults: pick(DEFAULT_EFFECTS, ["fxaaEnabled", "msaaSamples", "supersample"]),
        fields,
    });
}

export function createPixelRatioSection(): SectionComponent<PixelRatioFields> {
    const fields: ReadonlyArray<SectionField<PixelRatioFields>> = [
        {
            type: "slider",
            key: "pixelRatio",
            label: "Pixel ratio",
            min: PIXEL_RATIO_MIN,
            max: PIXEL_RATIO_MAX,
            step: PIXEL_RATIO_STEP,
            formatValue: (n) => `${n.toFixed(1)}×`,
            snapshotPath: pathNumber("pixelRatio", "pixelRatio"),
        },
    ];
    return new SectionComponent<PixelRatioFields>({
        snapshotName: "pixelRatio",
        title: "Pixel Ratio",
        eventName: "pixel-ratio-change",
        defaults: { ...DEFAULT_PIXEL_RATIO },
        fields,
    });
}

export function createColorSpaceSection(): SectionComponent<ColorSpaceFields> {
    const fields: ReadonlyArray<SectionField<ColorSpaceFields>> = [
        {
            type: "dropdown",
            key: "colorSpace",
            options: COLOR_SPACE_OPTIONS,
            snapshotPath: pathStep("colorSpace", "colorSpace"),
        },
    ];
    return new SectionComponent<ColorSpaceFields>({
        snapshotName: "colorSpace",
        title: "Color Space",
        eventName: "color-space-change",
        defaults: { ...DEFAULT_COLOR_SPACE },
        fields,
    });
}

// ─── Lighting (Light tab) ─────────────────────────────────────────

export function createEnvironmentSection(): SectionComponent<EnvironmentSettings> {
    const fields: ReadonlyArray<SectionField<EnvironmentSettings>> = [
        { type: "toggle", key: "enabled", label: "Environment", snapshotPath: pathStep("enabled", "enabled") },
        {
            type: "slider",
            key: "intensity",
            label: "Intensity",
            min: 0,
            max: ENV_INTENSITY_MAX,
            step: 0.05,
            snapshotPath: pathNumber("intensity", "intensity"),
        },
    ];
    return new SectionComponent<EnvironmentSettings>({
        snapshotName: "environment",
        title: "Environment",
        eventName: "environment-change",
        defaults: { ...DEFAULT_ENVIRONMENT },
        fields,
    });
}

export function createHemisphereSection(): SectionComponent<HemisphereSettings> {
    const fields: ReadonlyArray<SectionField<HemisphereSettings>> = [
        { type: "color", key: "skyColor", label: "Sky", snapshotPath: pathColor("skyColor", "skyColor") },
        { type: "color", key: "groundColor", label: "Ground", snapshotPath: pathColor("groundColor", "groundColor") },
        {
            type: "slider",
            key: "intensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("intensity", "intensity"),
        },
    ];
    return new SectionComponent<HemisphereSettings>({
        snapshotName: "hemisphere",
        title: "Hemisphere",
        eventName: "hemisphere-change",
        defaults: { ...DEFAULT_HEMISPHERE },
        fields,
    });
}

export function createRimLightSection(): SectionComponent<RimLightSettings> {
    const fields: ReadonlyArray<SectionField<RimLightSettings>> = [
        {
            type: "slider",
            key: "intensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("intensity", "intensity"),
        },
        { type: "color", key: "color", label: "Color", snapshotPath: pathColor("color", "color") },
        {
            type: "slider",
            key: "positionX",
            label: "Position X",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("positionX", "positionX"),
        },
        {
            type: "slider",
            key: "positionY",
            label: "Position Y",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("positionY", "positionY"),
        },
        {
            type: "slider",
            key: "positionZ",
            label: "Position Z",
            min: LIGHT_POSITION_MIN,
            max: LIGHT_POSITION_MAX,
            step: 0.05,
            snapshotPath: pathNumber("positionZ", "positionZ"),
        },
    ];
    return new SectionComponent<RimLightSettings>({
        snapshotName: "rimLight",
        title: "Rim Light",
        eventName: "rim-light-change",
        defaults: { ...DEFAULT_RIM_LIGHT },
        fields,
    });
}

export function createTopLightSection(): SectionComponent<TopLightSettings> {
    const fields: ReadonlyArray<SectionField<TopLightSettings>> = [
        {
            type: "slider",
            key: "intensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("intensity", "intensity"),
        },
        { type: "color", key: "color", label: "Color", snapshotPath: pathColor("color", "color") },
    ];
    return new SectionComponent<TopLightSettings>({
        snapshotName: "topLight",
        title: "Top Light",
        eventName: "top-light-change",
        defaults: { ...DEFAULT_TOP_LIGHT },
        fields,
    });
}

export function createBottomLightSection(): SectionComponent<BottomLightSettings> {
    const fields: ReadonlyArray<SectionField<BottomLightSettings>> = [
        {
            type: "slider",
            key: "intensity",
            label: "Intensity",
            min: 0,
            max: LIGHT_INTENSITY_MAX,
            step: 0.01,
            snapshotPath: pathNumber("intensity", "intensity"),
        },
        { type: "color", key: "color", label: "Color", snapshotPath: pathColor("color", "color") },
    ];
    return new SectionComponent<BottomLightSettings>({
        snapshotName: "bottomLight",
        title: "Bottom Kicker",
        eventName: "bottom-light-change",
        defaults: { ...DEFAULT_BOTTOM_LIGHT },
        fields,
    });
}

// suppress unused-import warnings for types referenced only via Pick / fields
void (null as unknown as EnvironmentSettings);
void (null as unknown as HemisphereSettings);
void (null as unknown as RimLightSettings);
void (null as unknown as TopLightSettings);
void (null as unknown as BottomLightSettings);

export function createStressSection(): SectionComponent<StressSettings> {
    const fields: ReadonlyArray<SectionField<StressSettings>> = [
        { type: "toggle", key: "enabled", label: "Cursor glitch", snapshotPath: pathStep("enabled", "enabled") },
        {
            type: "slider",
            key: "radius",
            label: "Radius",
            min: 0.05,
            max: 2,
            step: 0.01,
            snapshotPath: pathNumber("radius", "radius"),
        },
        {
            type: "slider",
            key: "lerp",
            label: "Smoothing",
            min: 0.01,
            max: 1,
            step: 0.01,
            snapshotPath: pathNumber("lerp", "lerp"),
        },
        { type: "color", key: "glowColor", label: "Glow", snapshotPath: pathColor("glowColor", "glowColor") },
    ];
    return new SectionComponent<StressSettings>({
        snapshotName: "stress",
        title: "Stress",
        eventName: "stress-change",
        defaults: { ...DEFAULT_STRESS },
        fields,
    });
}

function pick<T extends object, K extends keyof T>(source: T, keys: ReadonlyArray<K>): Pick<T, K> {
    const out = {} as Pick<T, K>;
    for (const key of keys) {
        out[key] = source[key];
    }
    return out;
}
