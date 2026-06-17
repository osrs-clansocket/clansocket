export type ToneMappingMode = "none" | "linear" | "reinhard" | "cineon" | "aces" | "agx";

export interface ToneMappingOption {
    value: ToneMappingMode;
    label: string;
}

export interface EffectsSettings {
    backgroundColor: string;
    toneMapping: ToneMappingMode;
    exposure: number;
    bloomEnabled: boolean;
    bloomStrength: number;
    bloomRadius: number;
    bloomThreshold: number;
    outlineEnabled: boolean;
    outlineColor: string;
    outlineThickness: number;
    fxaaEnabled: boolean;
    // Scene-section grid + axes customisation (Phase 2)
    gridColor: string;
    gridSize: number;
    gridDivisions: number;
    gridFloorY: number;
    axesLength: number;
    // Effects-section post-FX (Phase 7)
    vignetteEnabled: boolean;
    vignetteAmount: number;
    vignetteColor: string;
    chromaticAberrationEnabled: boolean;
    chromaticAberrationAmount: number;
    contrastEnabled: boolean;
    contrastAmount: number;
    // Render quality
    msaaSamples: number;
    supersample: number;
}
