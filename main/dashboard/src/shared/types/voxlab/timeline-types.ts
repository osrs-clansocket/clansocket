import type { SceneSnapshot } from "./snapshot-types.js";

export const TIMELINE_SCHEMA_VERSION = 5 as const;

export type EaseName =
    | "linear"
    | "easeIn"
    | "easeOut"
    | "easeInOut"
    | "easeInCubic"
    | "easeOutCubic"
    | "easeInOutCubic";

export type InterpName = "number" | "color" | "step";

export type TrackType = "number" | "color" | "step";

export interface Keyframe<V = unknown> {
    t: number;
    v: V;
    ease?: EaseName;
    interp?: InterpName;
    /** Tag identifying which animation preset emitted this keyframe (if any). */
    presetId?: string;
}

export interface Track<V = unknown> {
    property: string;
    type: TrackType;
    keyframes: Keyframe<V>[];
}

export interface Timeline {
    schemaVersion: typeof TIMELINE_SCHEMA_VERSION;
    durationMs: number;
    loop: boolean;
    fps: number;
    /**
     * true → Catmull-Rom spline through keyframes (default).
     * false → straight-line linear interpolation between adjacent keyframes.
     */
    smoothing: boolean;
    initialSnapshot: SceneSnapshot;
    tracks: Track[];
}
