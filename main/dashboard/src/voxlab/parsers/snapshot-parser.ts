import { SNAPSHOT_SCHEMA_VERSION, type SceneSnapshot } from "../../shared/types/voxlab/snapshot-types.js";

export interface ParsedSnapshot {
    data: SceneSnapshot;
    fileSize: number;
}

export type SnapshotMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

const SNAPSHOT_MIGRATIONS: Record<number, SnapshotMigration> = {
    1: migrateV1ToV2,
    2: migrateV2ToV3,
    3: migrateV3ToV4,
    4: migrateV4ToV5,
    5: migrateV5ToV6,
    6: migrateV6ToV7,
    7: migrateV7ToV8,
    8: migrateV8ToV9,
    9: migrateV9ToV10,
    10: migrateV10ToV11,
    11: migrateV11ToV12,
    12: migrateV12ToV13,
};

export function parseSnapshotJson(jsonText: string, fileSize: number): ParsedSnapshot {
    const initial = JSON.parse(jsonText);
    if (!isObject(initial)) {
        throw new Error("File does not look like a Voxlab scene snapshot");
    }
    const migrated = applyMigrations(initial as Record<string, unknown>);
    if (!isSnapshotShape(migrated)) {
        throw new Error("File does not look like a Voxlab scene snapshot");
    }
    if (migrated.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
        throw new Error(
            `Unsupported snapshot schemaVersion ${String(migrated.schemaVersion)} (expected ${SNAPSHOT_SCHEMA_VERSION})`,
        );
    }
    return { data: migrated, fileSize };
}

function applyMigrations(raw: Record<string, unknown>): Record<string, unknown> {
    let current = raw;
    let safetyCounter = 0;
    while (typeof current.schemaVersion === "number" && current.schemaVersion < SNAPSHOT_SCHEMA_VERSION) {
        const migrate = SNAPSHOT_MIGRATIONS[current.schemaVersion];
        if (!migrate) {
            throw new Error(
                `No snapshot migration registered from v${current.schemaVersion} to v${SNAPSHOT_SCHEMA_VERSION}`,
            );
        }
        current = migrate(current);
        safetyCounter++;
        if (safetyCounter > 16) {
            throw new Error("Snapshot migration loop detected");
        }
    }
    return current;
}

function migrateV12ToV13(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    delete parts.texture;
    return { ...raw, schemaVersion: 13, parts };
}

function migrateV11ToV12(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    if (isObject(parts.surface)) {
        const s = { ...(parts.surface as Record<string, unknown>) };
        if (typeof s.flatShading === "boolean") {
            const flatShading = s.flatShading as boolean;
            const existingShading = isObject(parts.shading) ? (parts.shading as Record<string, unknown>) : {};
            parts.shading = {
                smoothShading:
                    typeof existingShading.smoothShading === "boolean" ? existingShading.smoothShading : false,
                flatShading,
            };
            delete s.flatShading;
            parts.surface = s;
        }
    }
    return { ...raw, schemaVersion: 12, parts };
}

function migrateV10ToV11(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    if (isObject(parts.postFx)) {
        const pfx = parts.postFx as Record<string, unknown>;
        if (parts.vignette === undefined) {
            parts.vignette = {
                vignetteEnabled: !!pfx.vignetteEnabled,
                vignetteAmount: typeof pfx.vignetteAmount === "number" ? pfx.vignetteAmount : 0.4,
                vignetteColor: typeof pfx.vignetteColor === "string" ? pfx.vignetteColor : "#000000",
            };
        }
        if (parts.contrast === undefined) {
            parts.contrast = {
                contrastEnabled: !!pfx.contrastEnabled,
                contrastAmount: typeof pfx.contrastAmount === "number" ? pfx.contrastAmount : 0.2,
            };
        }
        if (parts.chromaticAberration === undefined) {
            parts.chromaticAberration = {
                chromaticAberrationEnabled: !!pfx.chromaticAberrationEnabled,
                chromaticAberrationAmount:
                    typeof pfx.chromaticAberrationAmount === "number" ? pfx.chromaticAberrationAmount : 0.3,
            };
        }
        delete parts.postFx;
    }
    return { ...raw, schemaVersion: 11, parts };
}

function migrateV9ToV10(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    if (isObject(parts.display)) {
        const d = parts.display as Record<string, unknown>;
        if (parts.wireframe === undefined) {
            parts.wireframe = {
                enabled: !!d.wireframe,
                color: typeof d.wireframeColor === "string" ? d.wireframeColor : "#f5ca7a",
                opacity: typeof d.wireframeOpacity === "number" ? d.wireframeOpacity : 0.35,
            };
        }
        if (parts.shading === undefined) {
            parts.shading = { smoothShading: !!d.smoothShading };
        }
        if (parts.shadows === undefined) {
            parts.shadows = { enabled: !!d.castShadows };
        }
        if (isObject(parts.gridAxes)) {
            const g = { ...(parts.gridAxes as Record<string, unknown>) };
            if (g.gridEnabled === undefined && typeof d.showGrid === "boolean") {
                g.gridEnabled = d.showGrid;
            }
            parts.gridAxes = g;
        }
        delete parts.display;
    }
    return { ...raw, schemaVersion: 10, parts };
}

function migrateV8ToV9(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    if (isObject(parts.world)) {
        const w = parts.world as Record<string, unknown>;
        parts.background = { backgroundColor: w.backgroundColor };
        parts.toneExposure = { toneMapping: w.toneMapping, exposure: w.exposure };
        delete parts.world;
    }
    return { ...raw, schemaVersion: 9, parts };
}

function migrateV7ToV8(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    if (parts.texture === undefined) {
        parts.texture = { enabled: false };
    }
    return { ...raw, schemaVersion: 8, parts };
}

function migrateV6ToV7(raw: Record<string, unknown>): Record<string, unknown> {
    return { ...raw, schemaVersion: 7 };
}

function migrateV5ToV6(raw: Record<string, unknown>): Record<string, unknown> {
    return { ...raw, schemaVersion: 6 };
}

function migrateV4ToV5(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    // Room-tab parts didn't exist in v4 — seed them with sensible defaults so
    // restored snapshots still light correctly under the new rig.
    if (parts.environment === undefined) {
        parts.environment = { enabled: true, intensity: 1, hdrName: null };
    }
    if (parts.hemisphere === undefined) {
        parts.hemisphere = { skyColor: "#d8e6f2", groundColor: "#3a2d1a", intensity: 0.5 };
    }
    if (parts.rimLight === undefined) {
        parts.rimLight = { intensity: 0.8, color: "#ffffff", positionX: -2, positionY: 1.5, positionZ: -3 };
    }
    if (parts.topLight === undefined) {
        parts.topLight = { intensity: 0.6, color: "#ffffff" };
    }
    if (parts.bottomLight === undefined) {
        parts.bottomLight = { intensity: 0.2, color: "#f5ca7a" };
    }
    return { ...raw, schemaVersion: 5, parts };
}

function migrateV3ToV4(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    const material = isObject(parts.material) ? (parts.material as Record<string, unknown>) : {};
    const scene = isObject(parts.scene) ? (parts.scene as Record<string, unknown>) : {};
    const effectsContainer = isObject(parts.effects) ? (parts.effects as Record<string, unknown>) : {};
    const effectsInner = isObject(effectsContainer.effects)
        ? (effectsContainer.effects as Record<string, unknown>)
        : {};
    const stressInner = isObject(effectsContainer.stress) ? (effectsContainer.stress as Record<string, unknown>) : {};
    const light = isObject(parts.light) ? (parts.light as Record<string, unknown>) : {};
    // v3 stored bg/tone-map/exposure/grid in BOTH parts.scene and parts.effects.effects;
    // prefer the scene-section copy since it was the visible authority.
    const worldSource = { ...effectsInner, ...scene };

    parts.surface = pickKeys(material, ["tint", "opacity", "metalness", "roughness", "flatShading"]);
    parts.emissive = pickKeys(material, ["emissiveColor", "emissiveIntensity"]);
    parts.coatSheen = pickKeys(material, [
        "clearcoat",
        "clearcoatRoughness",
        "ior",
        "sheen",
        "sheenColor",
        "anisotropy",
    ]);
    parts.ambient = pickKeys(light, ["ambientIntensity"]);
    parts.keyLight = pickKeys(light, [
        "keyIntensity",
        "keyPositionX",
        "keyPositionY",
        "keyPositionZ",
        "shadowBias",
        "shadowRadius",
    ]);
    parts.fillLight = pickKeys(light, [
        "fillIntensity",
        "fillColor",
        "fillPositionX",
        "fillPositionY",
        "fillPositionZ",
    ]);
    parts.world = pickKeys(worldSource, ["backgroundColor", "toneMapping", "exposure"]);
    parts.gridAxes = pickKeys(worldSource, ["gridColor", "gridSize", "gridDivisions", "gridFloorY", "axesLength"]);
    parts.bloom = pickKeys(effectsInner, ["bloomEnabled", "bloomStrength", "bloomRadius", "bloomThreshold"]);
    parts.outline = pickKeys(effectsInner, ["outlineEnabled", "outlineColor", "outlineThickness"]);
    parts.postFx = pickKeys(effectsInner, [
        "vignetteEnabled",
        "vignetteAmount",
        "vignetteColor",
        "chromaticAberrationEnabled",
        "chromaticAberrationAmount",
        "contrastEnabled",
        "contrastAmount",
    ]);
    parts.quality = pickKeys(effectsInner, ["fxaaEnabled", "msaaSamples", "supersample"]);
    parts.stress = { ...stressInner };

    delete parts.material;
    delete parts.scene;
    delete parts.effects;
    delete parts.light;

    return { ...raw, schemaVersion: 4, parts };
}

function pickKeys(source: Record<string, unknown>, keys: ReadonlyArray<string>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of keys) {
        if (source[key] !== undefined) {
            out[key] = source[key];
        }
    }
    return out;
}

function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
    const parts = isObject(raw.parts) ? { ...(raw.parts as Record<string, unknown>) } : {};
    const viewport = isObject(parts.viewport) ? (parts.viewport as Record<string, unknown>) : null;
    const pos = viewport && Array.isArray(viewport.cameraPosition) ? viewport.cameraPosition : [1.3, 0.9, 1.6];
    const tgt = viewport && Array.isArray(viewport.cameraTarget) ? viewport.cameraTarget : [0, 0, 0];
    parts.camera = {
        fov: 45,
        positionX: pos[0],
        positionY: pos[1],
        positionZ: pos[2],
        targetX: tgt[0],
        targetY: tgt[1],
        targetZ: tgt[2],
    };
    delete parts.viewport;
    return { ...raw, schemaVersion: 3, parts };
}

function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
    const sections = isObject(raw.sections) ? (raw.sections as Record<string, unknown>) : {};
    const viewport = isObject(raw.viewport) ? (raw.viewport as Record<string, unknown>) : {};
    const display = isObject(raw.display) ? raw.display : {};
    return {
        schemaVersion: 2,
        capturedAt: typeof raw.capturedAt === "number" ? raw.capturedAt : Date.now(),
        parts: {
            effects: sections.effects,
            material: sections.material,
            motion: sections.motion,
            scene: sections.scene,
            display,
            viewport: {
                cameraPosition: viewport.cameraPosition,
                cameraTarget: viewport.cameraTarget,
            },
        },
    };
}

function isSnapshotShape(value: unknown): value is SceneSnapshot {
    if (!isObject(value)) {
        return false;
    }
    const v = value as Record<string, unknown>;
    if (typeof v.schemaVersion !== "number" || typeof v.capturedAt !== "number") {
        return false;
    }
    return isObject(v.parts);
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
