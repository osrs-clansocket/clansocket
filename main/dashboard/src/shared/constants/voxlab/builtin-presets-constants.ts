import { SNAPSHOT_SCHEMA_VERSION, type SceneSnapshot } from "../../types/voxlab/snapshot-types.js";

export interface BuiltinPreset {
    id: string;
    name: string;
    snapshot: SceneSnapshot;
}

function preset(id: string, name: string, parts: Record<string, unknown>): BuiltinPreset {
    return {
        id,
        name,
        snapshot: {
            schemaVersion: SNAPSHOT_SCHEMA_VERSION,
            capturedAt: 0,
            parts,
        },
    };
}

export const BUILTIN_PRESETS: ReadonlyArray<BuiltinPreset> = [
    preset("hero-logo", "Hero Logo", {
        surface: { tint: "#f5ca7a", opacity: 1.0, metalness: 0.6, roughness: 0.3 },
        shading: { smoothShading: false, flatShading: false },
        emissive: { emissiveColor: "#9f6b1c", emissiveIntensity: 0.25 },
        coatSheen: {
            clearcoat: 0.4,
            clearcoatRoughness: 0.15,
            ior: 1.5,
            sheen: 0,
            sheenColor: "#ffffff",
            anisotropy: 0,
        },
        ambient: { ambientIntensity: 0.35 },
        keyLight: {
            keyIntensity: 1.4,
            keyPositionX: 2,
            keyPositionY: 3,
            keyPositionZ: 2.5,
            shadowBias: -0.0005,
            shadowRadius: 4,
        },
        fillLight: {
            fillIntensity: 0.6,
            fillColor: "#f5ca7a",
            fillPositionX: -2.5,
            fillPositionY: -1,
            fillPositionZ: -2,
        },
        world: { backgroundColor: "#0a0907", toneMapping: "aces", exposure: 1.1 },
        bloom: { bloomEnabled: true, bloomStrength: 0.8, bloomRadius: 0.6, bloomThreshold: 0.7 },
        outline: { outlineEnabled: false, outlineColor: "#f5ca7a", outlineThickness: 2 },
        vignette: { vignetteEnabled: true, vignetteAmount: 0.4, vignetteColor: "#000000" },
        contrast: { contrastEnabled: true, contrastAmount: 0.15 },
        chromaticAberration: { chromaticAberrationEnabled: false, chromaticAberrationAmount: 0 },
        quality: { fxaaEnabled: true, msaaSamples: 4, supersample: 1 },
    }),
    preset("glass", "Glass", {
        surface: { tint: "#d8e6f2", opacity: 0.55, metalness: 0.0, roughness: 0.05 },
        shading: { smoothShading: false, flatShading: false },
        emissive: { emissiveColor: "#000000", emissiveIntensity: 0 },
        coatSheen: {
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            ior: 1.7,
            sheen: 0,
            sheenColor: "#ffffff",
            anisotropy: 0,
        },
        world: { backgroundColor: "#0e0e0e", toneMapping: "aces", exposure: 1.0 },
        bloom: { bloomEnabled: true, bloomStrength: 0.5, bloomRadius: 0.7, bloomThreshold: 0.85 },
        outline: { outlineEnabled: false, outlineColor: "#ffffff", outlineThickness: 1.5 },
        vignette: { vignetteEnabled: false, vignetteAmount: 0, vignetteColor: "#000000" },
        contrast: { contrastEnabled: false, contrastAmount: 0 },
        chromaticAberration: { chromaticAberrationEnabled: true, chromaticAberrationAmount: 0.15 },
        quality: { fxaaEnabled: true, msaaSamples: 8, supersample: 1.5 },
    }),
    preset("stealth", "Stealth", {
        surface: { tint: "#1a1a1a", opacity: 1.0, metalness: 0.85, roughness: 0.45 },
        shading: { smoothShading: false, flatShading: false },
        emissive: { emissiveColor: "#000000", emissiveIntensity: 0 },
        coatSheen: { clearcoat: 0, clearcoatRoughness: 0, ior: 1.5, sheen: 0, sheenColor: "#ffffff", anisotropy: 0 },
        ambient: { ambientIntensity: 0.15 },
        keyLight: {
            keyIntensity: 0.9,
            keyPositionX: 2,
            keyPositionY: 3,
            keyPositionZ: 2.5,
            shadowBias: -0.0005,
            shadowRadius: 6,
        },
        fillLight: {
            fillIntensity: 0.2,
            fillColor: "#3a3a45",
            fillPositionX: -2.5,
            fillPositionY: -1,
            fillPositionZ: -2,
        },
        world: { backgroundColor: "#050505", toneMapping: "aces", exposure: 0.9 },
        bloom: { bloomEnabled: false, bloomStrength: 0, bloomRadius: 0, bloomThreshold: 0 },
        vignette: { vignetteEnabled: true, vignetteAmount: 0.7, vignetteColor: "#000000" },
        contrast: { contrastEnabled: true, contrastAmount: 0.3 },
        chromaticAberration: { chromaticAberrationEnabled: false, chromaticAberrationAmount: 0 },
        quality: { fxaaEnabled: true, msaaSamples: 4, supersample: 1 },
    }),
    preset("vibrant", "Vibrant", {
        surface: { tint: "#ffffff", opacity: 1.0, metalness: 0.2, roughness: 0.4 },
        shading: { smoothShading: false, flatShading: false },
        emissive: { emissiveColor: "#321f0a", emissiveIntensity: 0.35 },
        coatSheen: {
            clearcoat: 0.3,
            clearcoatRoughness: 0.1,
            ior: 1.5,
            sheen: 0.4,
            sheenColor: "#f5ca7a",
            anisotropy: 0.1,
        },
        world: { backgroundColor: "#0e0e0e", toneMapping: "agx", exposure: 1.2 },
        bloom: { bloomEnabled: true, bloomStrength: 1.2, bloomRadius: 0.8, bloomThreshold: 0.6 },
        outline: { outlineEnabled: false, outlineColor: "#f5ca7a", outlineThickness: 1 },
        vignette: { vignetteEnabled: true, vignetteAmount: 0.3, vignetteColor: "#0a0908" },
        contrast: { contrastEnabled: true, contrastAmount: 0.25 },
        chromaticAberration: { chromaticAberrationEnabled: true, chromaticAberrationAmount: 0.2 },
        quality: { fxaaEnabled: true, msaaSamples: 4, supersample: 1 },
    }),
    preset("wireframe", "Wireframe", {
        display: {
            material: "standard",
            smoothShading: false,
            wireframe: true,
            wireframeColor: "#f5ca7a",
            wireframeOpacity: 0.9,
            showGrid: true,
            castShadows: false,
        },
        surface: { tint: "#1a1a1a", opacity: 0.15, metalness: 0, roughness: 1 },
        shading: { smoothShading: false, flatShading: true },
        emissive: { emissiveColor: "#000000", emissiveIntensity: 0 },
        world: { backgroundColor: "#0e0e0e", toneMapping: "none", exposure: 1.0 },
        bloom: { bloomEnabled: false, bloomStrength: 0, bloomRadius: 0, bloomThreshold: 0 },
        vignette: { vignetteEnabled: false, vignetteAmount: 0, vignetteColor: "#000000" },
        contrast: { contrastEnabled: false, contrastAmount: 0 },
        chromaticAberration: { chromaticAberrationEnabled: false, chromaticAberrationAmount: 0 },
    }),
];
