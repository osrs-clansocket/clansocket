import { TIMELINE_SCHEMA_VERSION, type Timeline } from "../../shared/types/voxlab/timeline-types.js";

export interface ParsedTimeline {
    data: Timeline;
    fileSize: number;
}

export type TimelineMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

const TIMELINE_MIGRATIONS: Record<number, TimelineMigration> = {
    1: migrateV1ToV2,
    2: migrateV2ToV3,
    3: migrateV3ToV4,
    4: migrateV4ToV5,
};

export function parseTimelineJson(jsonText: string, fileSize: number): ParsedTimeline {
    const initial = JSON.parse(jsonText);
    if (!isObject(initial)) {
        throw new Error("File does not look like a Voxlab timeline");
    }
    const migrated = applyMigrations(initial as Record<string, unknown>);
    if (!isTimelineShape(migrated)) {
        throw new Error("File does not look like a Voxlab timeline");
    }
    if (migrated.schemaVersion !== TIMELINE_SCHEMA_VERSION) {
        throw new Error(
            `Unsupported timeline schemaVersion ${String(migrated.schemaVersion)} (expected ${TIMELINE_SCHEMA_VERSION})`,
        );
    }
    return { data: migrated, fileSize };
}

function applyMigrations(raw: Record<string, unknown>): Record<string, unknown> {
    let current = raw;
    let safetyCounter = 0;
    while (typeof current.schemaVersion === "number" && current.schemaVersion < TIMELINE_SCHEMA_VERSION) {
        const migrate = TIMELINE_MIGRATIONS[current.schemaVersion];
        if (!migrate) {
            throw new Error(
                `No timeline migration registered from v${current.schemaVersion} to v${TIMELINE_SCHEMA_VERSION}`,
            );
        }
        current = migrate(current);
        safetyCounter++;
        if (safetyCounter > 16) {
            throw new Error("Timeline migration loop detected");
        }
    }
    return current;
}

function migrateV4ToV5(raw: Record<string, unknown>): Record<string, unknown> {
    // Animation-preset tagging on keyframes is purely additive — nothing to
    // rewrite on legacy timelines, just bump the version.
    return { ...raw, schemaVersion: 5 };
}

function migrateV3ToV4(raw: Record<string, unknown>): Record<string, unknown> {
    // Default new field to true so existing timelines load with the smoother
    // playback that was always implicit before the toggle existed.
    return { ...raw, schemaVersion: 4, smoothing: raw.smoothing !== false };
}

function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
    const initial: Record<string, unknown> = isObject(raw.initialSnapshot)
        ? { ...(raw.initialSnapshot as Record<string, unknown>) }
        : { parts: {} };
    const parts: Record<string, unknown> = isObject(initial.parts)
        ? { ...(initial.parts as Record<string, unknown>) }
        : {};
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
    initial.parts = parts;
    initial.schemaVersion = 3;
    const rewrittenTracks = Array.isArray(raw.tracks)
        ? raw.tracks.map((t) => (isObject(t) ? rewriteTrackPath(t as Record<string, unknown>) : t))
        : raw.tracks;
    return { ...raw, schemaVersion: 3, initialSnapshot: initial, tracks: rewrittenTracks };
}

function rewriteTrackPath(track: Record<string, unknown>): Record<string, unknown> {
    if (typeof track.property !== "string") {
        return track;
    }
    const map: Record<string, string> = {
        "camera.position.x": "camera.positionX",
        "camera.position.y": "camera.positionY",
        "camera.position.z": "camera.positionZ",
        "camera.target.x": "camera.targetX",
        "camera.target.y": "camera.targetY",
        "camera.target.z": "camera.targetZ",
    };
    const next = map[track.property];
    return next ? { ...track, property: next } : track;
}

function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
    const initial = isObject(raw.initialSnapshot) ? (raw.initialSnapshot as Record<string, unknown>) : {};
    const initialSections = isObject(initial.sections) ? (initial.sections as Record<string, unknown>) : {};
    const initialViewport = isObject(initial.viewport) ? (initial.viewport as Record<string, unknown>) : {};
    const migratedInitial = {
        schemaVersion: 2,
        capturedAt: typeof initial.capturedAt === "number" ? initial.capturedAt : 0,
        parts: {
            effects: initialSections.effects,
            material: initialSections.material,
            motion: initialSections.motion,
            scene: initialSections.scene,
            display: initial.display,
            viewport: {
                cameraPosition: initialViewport.cameraPosition,
                cameraTarget: initialViewport.cameraTarget,
            },
        },
    };
    return {
        ...raw,
        schemaVersion: 2,
        initialSnapshot: migratedInitial,
    };
}

function isTimelineShape(value: unknown): value is Timeline {
    if (!isObject(value)) {
        return false;
    }
    const v = value as Record<string, unknown>;
    if (
        typeof v.schemaVersion !== "number" ||
        typeof v.durationMs !== "number" ||
        typeof v.fps !== "number" ||
        typeof v.loop !== "boolean"
    ) {
        return false;
    }
    if (!Array.isArray(v.tracks)) {
        return false;
    }
    if (!isObject(v.initialSnapshot)) {
        return false;
    }
    for (const t of v.tracks) {
        if (!isObject(t)) {
            return false;
        }
        const trk = t as Record<string, unknown>;
        if (typeof trk.property !== "string" || typeof trk.type !== "string") {
            return false;
        }
        if (!Array.isArray(trk.keyframes)) {
            return false;
        }
        for (const k of trk.keyframes) {
            if (!isObject(k)) {
                return false;
            }
            const kf = k as Record<string, unknown>;
            if (typeof kf.t !== "number" || !("v" in kf)) {
                return false;
            }
        }
    }
    return true;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
