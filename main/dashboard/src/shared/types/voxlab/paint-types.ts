export type MeshPart = "front" | "back" | "sides";

export type BrushMode = "paint" | "erase";

export interface PartsPaintState {
    front: string | null;
    back: string | null;
    sides: string | null;
}

export interface PaintOverride {
    vertexIndex: number;
    rgb: [number, number, number];
}

export interface PaintSnapshotState {
    parts: PartsPaintState;
    overrides: PaintOverride[];
}

export interface BrushState {
    color: string;
    radius: number;
    falloffSigma: number;
    opacity: number;
    mode: BrushMode;
    paintMode: boolean;
    eyedropper: boolean;
    mirrorX: boolean;
    mirrorY: boolean;
    mirrorZ: boolean;
    hideBackFaces: boolean;
}

export interface PartsFillEventDetail {
    part: MeshPart;
    color: string;
}

export interface PartsResetEventDetail {
    part: MeshPart;
}

export interface PartsSectionState {
    color: string;
}

export interface BrushChangeEventDetail {
    color: string;
    radius: number;
    falloffSigma: number;
    opacity: number;
    mode: BrushMode;
    paintMode: boolean;
    eyedropper: boolean;
    mirrorX: boolean;
    mirrorY: boolean;
    mirrorZ: boolean;
    hideBackFaces: boolean;
}

export interface PaintClearAllEventDetail {
    timestamp: number;
}

export type GradientType = "linear" | "radial";
export type GradientAxis = "x" | "y" | "z";
export type GradientTarget = "front" | "back" | "sides" | "all";

export interface GradientStop {
    color: string;
    position: number;
}

export interface GradientSpec {
    stops: GradientStop[];
    type: GradientType;
    axis: GradientAxis;
    target: GradientTarget;
}

export type GradientApplyEventDetail = GradientSpec;

export type AlbedoSource = "source-image" | "uploaded" | "none";

export interface AlbedoSettings {
    source: AlbedoSource;
    uploadedDataUrl: string | null;
}

export type AlbedoChangeEventDetail = AlbedoSettings;

export type PbrMapSlot = "normal" | "roughness" | "metalness" | "ao";

export interface PbrMapsSettings {
    normal: string | null;
    roughness: string | null;
    metalness: string | null;
    ao: string | null;
    normalScale: number;
    roughnessIntensity: number;
    metalnessIntensity: number;
    aoIntensity: number;
}

export interface PbrIntensitySettings {
    normal: number;
    roughness: number;
    metalness: number;
    ao: number;
}

export type PbrMapsChangeEventDetail = PbrMapsSettings;

export interface PbrMapApplyDetail {
    slot: PbrMapSlot;
    dataUrl: string | null;
}

export interface PbrGenerateEventDetail {
    normal: boolean;
    roughness: boolean;
    metalness: boolean;
    ao: boolean;
    sobelStrength: number;
    metalnessThreshold: number;
    aoRadius: number;
}
