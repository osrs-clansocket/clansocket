import { SNAPSHOT_SCHEMA_VERSION } from "../../shared/types/voxlab/snapshot-types.js";
import { TIMELINE_SCHEMA_VERSION, type Timeline, type Track } from "../../shared/types/voxlab/timeline-types.js";
import { getPathDescriptor } from "../timeline/property-paths.js";

export interface ValidationOk {
    ok: true;
    warnings: string[];
}

export interface ValidationFail {
    ok: false;
    errors: string[];
    warnings: string[];
}

export type ValidationResult = ValidationOk | ValidationFail;

const NUMBER_EPSILON = 1e-6;
const MAX_FPS = 120;
const FRAME_BUDGET_BYTES = 500_000_000;

export function validateTimeline(timeline: Timeline, captureWidth?: number, captureHeight?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (timeline.schemaVersion !== TIMELINE_SCHEMA_VERSION) {
        errors.push(`schemaVersion must be ${TIMELINE_SCHEMA_VERSION}, got ${String(timeline.schemaVersion)}`);
    }
    if (!Number.isFinite(timeline.durationMs) || timeline.durationMs <= 0) {
        errors.push(`durationMs must be > 0, got ${timeline.durationMs}`);
    }
    if (!Number.isFinite(timeline.fps) || timeline.fps <= 0) {
        errors.push(`fps must be > 0, got ${timeline.fps}`);
    } else if (timeline.fps > MAX_FPS) {
        errors.push(`fps ${timeline.fps} exceeds maximum ${MAX_FPS}`);
    }

    if (!timeline.initialSnapshot || typeof timeline.initialSnapshot !== "object") {
        errors.push("initialSnapshot is missing");
    } else if (timeline.initialSnapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
        errors.push(
            `initialSnapshot.schemaVersion must be ${SNAPSHOT_SCHEMA_VERSION}, got ${String(timeline.initialSnapshot.schemaVersion)}`,
        );
    }

    for (let i = 0; i < timeline.tracks.length; i++) {
        validateTrack(timeline, timeline.tracks[i], i, errors, warnings);
    }

    if (captureWidth !== undefined && captureHeight !== undefined) {
        const frameCount = Math.round((timeline.durationMs / 1000) * timeline.fps);
        const heldBytes = frameCount * captureWidth * captureHeight * 4;
        if (heldBytes > FRAME_BUDGET_BYTES) {
            warnings.push(
                `Naive collection of ${frameCount} ${captureWidth}x${captureHeight} frames would use ${Math.round(heldBytes / 1_000_000)} MB; streaming bake required (already used).`,
            );
        }
    }

    if (errors.length > 0) {
        return { ok: false, errors, warnings };
    }
    return { ok: true, warnings };
}

function validateTrack(timeline: Timeline, track: Track, index: number, errors: string[], warnings: string[]): void {
    const label = `tracks[${index}] "${track.property}"`;
    const descriptor = getPathDescriptor(track.property);
    if (!descriptor) {
        errors.push(`${label}: property is not in the allowed path list`);
        return;
    }
    if (track.type !== descriptor.type) {
        errors.push(`${label}: declared type "${track.type}" does not match registered type "${descriptor.type}"`);
    }
    if (track.keyframes.length === 0) {
        errors.push(`${label}: keyframes array is empty`);
        return;
    }
    let prevT = -Infinity;
    for (let i = 0; i < track.keyframes.length; i++) {
        const k = track.keyframes[i];
        if (!Number.isFinite(k.t) || k.t < 0 || k.t > timeline.durationMs) {
            errors.push(`${label}: keyframe ${i} t=${k.t} out of range [0, ${timeline.durationMs}]`);
        }
        if (k.t <= prevT) {
            errors.push(`${label}: keyframes not strictly monotonic (kf ${i} t=${k.t} <= prev=${prevT})`);
        }
        prevT = k.t;
        const valueError = checkValueType(descriptor.type, k.v);
        if (valueError) {
            errors.push(`${label}: keyframe ${i} ${valueError}`);
        }
    }
    if (timeline.loop && track.keyframes.length >= 2) {
        const first = track.keyframes[0];
        const last = track.keyframes[track.keyframes.length - 1];
        if (!valuesMatch(descriptor.type, first.v, last.v)) {
            warnings.push(
                `${label}: loop=true but first and last keyframe values differ; tween will jump at loop boundary`,
            );
        }
    }
}

function checkValueType(type: string, value: unknown): string | null {
    if (type === "number") {
        return typeof value === "number" && Number.isFinite(value)
            ? null
            : `value must be a finite number, got ${typeof value}`;
    }
    if (type === "color") {
        return typeof value === "string" && value.charAt(0) === "#" && (value.length === 7 || value.length === 4)
            ? null
            : `value must be a hex color string (#rrggbb), got ${typeof value}`;
    }
    return null;
}

function valuesMatch(type: string, a: unknown, b: unknown): boolean {
    if (type === "number") {
        return Math.abs((a as number) - (b as number)) <= NUMBER_EPSILON;
    }
    if (type === "color") {
        return typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
}
