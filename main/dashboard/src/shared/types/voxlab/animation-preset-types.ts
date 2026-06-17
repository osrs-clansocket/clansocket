import type { SceneSnapshot } from "./snapshot-types.js";
import type { TrackType } from "./timeline-types.js";

export type AnimationCategory = "Camera" | "Material" | "Lighting" | "Post-FX" | "Combo";

export interface GeneratedKeyframe {
    /** Time within [0, durationMs] — caller adds cursorOffset before insert. */
    t: number;
    v: unknown;
}

export interface GeneratedTrack {
    property: string;
    type: TrackType;
    keyframes: GeneratedKeyframe[];
}

export interface PresetContext {
    snapshot: SceneSnapshot;
    durationMs: number;
}

export interface AnimationPresetDefinition {
    id: string;
    name: string;
    category: AnimationCategory;
    defaultDurationMs: number;
    description?: string;
    generate(ctx: PresetContext): GeneratedTrack[];
}
