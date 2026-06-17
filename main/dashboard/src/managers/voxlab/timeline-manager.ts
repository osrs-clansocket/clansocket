import type { SceneSnapshot } from "../../shared/types/voxlab/snapshot-types.js";
import type { Timeline, Track } from "../../shared/types/voxlab/timeline-types.js";
import { snapshotRegistry, type SnapshotRegistry } from "../../state/voxlab/registries/snapshot-registry.js";
import { applyEase } from "../../voxlab/timeline/easings.js";
import { interpolate, smoothInterpolate } from "../../voxlab/timeline/interpolators.js";
import { applyByPath, getPathDescriptor } from "../../voxlab/timeline/property-paths.js";
import type { SnapshotManager } from "./snapshot-manager.js";

export interface TimelineManagerDeps {
    snapshot: SnapshotManager;
    // Optional per-instance registry override — keeps multi-renderer pages
    // independent. Falls back to the module-singleton snapshot registry.
    registry?: SnapshotRegistry;
}

export class TimelineManager extends EventTarget {
    private timeline: Timeline | null = null;
    private cursorMs = 0;
    private playStartMs = 0;
    private playStartCursor = 0;
    private rafHandle = 0;
    private playing = false;
    // Names of snapshot parts that have at least one keyframe in the timeline.
    // Per-frame restore filters by this so non-animated parts (which would
    // re-fire their `*-change` event with the same value 60×/s) are skipped.
    private animatedParts: Set<string> = new Set();

    constructor(private readonly deps: TimelineManagerDeps) {
        super();
    }

    load(timeline: Timeline): void {
        this.pause();
        this.timeline = timeline;
        this.cursorMs = 0;
        this.recomputeAnimatedParts();
        this.seek(0);
        this.emit("timeline-loaded", { durationMs: timeline.durationMs });
    }

    private recomputeAnimatedParts(): void {
        this.animatedParts = new Set();
        if (!this.timeline) {
            return;
        }
        for (const track of this.timeline.tracks) {
            const dot = track.property.indexOf(".");
            if (dot > 0) {
                this.animatedParts.add(track.property.slice(0, dot));
            }
        }
    }

    unload(): void {
        this.pause();
        this.timeline = null;
        this.cursorMs = 0;
        this.emit("timeline-unloaded", undefined);
    }

    hasTimeline(): boolean {
        return this.timeline !== null;
    }

    get durationMs(): number {
        return this.timeline?.durationMs ?? 0;
    }

    get currentTimeMs(): number {
        return this.cursorMs;
    }

    get isPlaying(): boolean {
        return this.playing;
    }

    getTimeline(): Timeline | null {
        return this.timeline;
    }

    get loop(): boolean {
        return this.timeline?.loop ?? false;
    }

    get smoothing(): boolean {
        return this.timeline?.smoothing ?? true;
    }

    setSmoothing(value: boolean): void {
        if (!this.timeline) {
            return;
        }
        if (this.timeline.smoothing === value) {
            return;
        }
        this.timeline.smoothing = value;
        this.emit("timeline-smoothing-changed", { smoothing: value });
        // Re-sample at the current cursor so the scene reflects the new curve.
        this.applyCursor(this.cursorMs, false);
    }

    toggleSmoothing(): void {
        this.setSmoothing(!this.smoothing);
    }

    get fps(): number {
        return this.timeline?.fps ?? 30;
    }

    stop(): void {
        this.pause();
        this.seek(0);
    }

    seekToEnd(): void {
        if (!this.timeline) {
            return;
        }
        this.seek(this.timeline.durationMs);
    }

    stepFrame(direction: number): void {
        if (!this.timeline) {
            return;
        }
        if (this.playing) {
            this.pause();
        }
        const frameMs = 1000 / Math.max(1, this.timeline.fps);
        this.seek(this.cursorMs + direction * frameMs);
    }

    setLoop(loop: boolean): void {
        if (!this.timeline) {
            return;
        }
        if (this.timeline.loop === loop) {
            return;
        }
        this.timeline.loop = loop;
        this.emit("timeline-loop-changed", { loop });
    }

    toggleLoop(): void {
        this.setLoop(!this.loop);
    }

    /**
     * Drop the keyframes from an animation preset onto the timeline.
     * Generated keyframes are tagged with `presetId` so they can be removed
     * later as a batch via `removePreset()`.
     */
    applyPresetKeyframes(
        presetId: string,
        snapshot: SceneSnapshot,
        durationMs: number,
        cursorOffsetMs: number,
        generatedTracks: ReadonlyArray<{
            property: string;
            type: "number" | "color" | "step";
            keyframes: ReadonlyArray<{ t: number; v: unknown }>;
        }>,
    ): void {
        if (!this.timeline) {
            return;
        }
        const epsilon = 0.5;
        const timelineDuration = this.timeline.durationMs;
        for (const gen of generatedTracks) {
            let track = this.timeline.tracks.find((t) => t.property === gen.property);
            if (!track) {
                track = { property: gen.property, type: gen.type, keyframes: [] };
                this.timeline.tracks.push(track);
            }
            for (const kf of gen.keyframes) {
                const tAbs = Math.max(0, Math.min(timelineDuration, kf.t + cursorOffsetMs));
                const existingIdx = track.keyframes.findIndex((k) => Math.abs(k.t - tAbs) < epsilon);
                if (existingIdx >= 0) {
                    track.keyframes[existingIdx].v = kf.v;
                    track.keyframes[existingIdx].presetId = presetId;
                } else {
                    const insertAt = track.keyframes.findIndex((k) => k.t > tAbs);
                    const newKf = { t: tAbs, v: kf.v, presetId };
                    if (insertAt < 0) {
                        track.keyframes.push(newKf);
                    } else {
                        track.keyframes.splice(insertAt, 0, newKf);
                    }
                }
            }
        }
        void snapshot;
        void durationMs;
        this.recomputeAnimatedParts();
        this.emit("timeline-tracks-changed", {
            trackCount: this.timeline.tracks.length,
            property: null,
        });
        this.applyCursor(this.cursorMs, false);
    }

    /** Strip every keyframe tagged with this preset id; drop empty tracks. */
    removePresetKeyframes(presetId: string): void {
        if (!this.timeline) {
            return;
        }
        const next: typeof this.timeline.tracks = [];
        for (const track of this.timeline.tracks) {
            const filtered = track.keyframes.filter((k) => k.presetId !== presetId);
            if (filtered.length > 0) {
                next.push({ ...track, keyframes: filtered });
            }
        }
        this.timeline.tracks = next;
        this.recomputeAnimatedParts();
        this.emit("timeline-tracks-changed", {
            trackCount: this.timeline.tracks.length,
            property: null,
        });
        this.applyCursor(this.cursorMs, false);
    }

    /**
     * Capture the current scene state as keyframes at the cursor for every
     * animatable path. Useful for "freeze the look here" without needing to
     * wiggle each slider so the recorder picks it up.
     */
    snapAllAtCursor(): void {
        if (!this.timeline) {
            return;
        }
        const snap = this.deps.snapshot.capture();
        const time = this.cursorMs;
        const epsilon = 0.5;
        for (const path of (this.deps.registry ?? snapshotRegistry).allPathStrings()) {
            const descriptor = getPathDescriptor(path);
            if (!descriptor) {
                continue;
            }
            const value = descriptor.read(snap);
            if (value === undefined) {
                continue;
            }
            let track = this.timeline.tracks.find((t) => t.property === path);
            if (!track) {
                track = { property: path, type: descriptor.type, keyframes: [] };
                this.timeline.tracks.push(track);
            }
            const existingIdx = track.keyframes.findIndex((k) => Math.abs(k.t - time) < epsilon);
            if (existingIdx >= 0) {
                track.keyframes[existingIdx].v = value;
            } else {
                const insertAt = track.keyframes.findIndex((k) => k.t > time);
                const newKf = { t: time, v: value };
                if (insertAt < 0) {
                    track.keyframes.push(newKf);
                } else {
                    track.keyframes.splice(insertAt, 0, newKf);
                }
            }
        }
        this.recomputeAnimatedParts();
        this.emit("timeline-tracks-changed", { trackCount: this.timeline.tracks.length, property: null });
    }

    /** Remove keyframes within half a frame of the cursor on every track. */
    deleteKeyframesNearCursor(): void {
        if (!this.timeline) {
            return;
        }
        const time = this.cursorMs;
        const tolerance = (1000 / Math.max(1, this.timeline.fps)) * 0.5;
        const next: typeof this.timeline.tracks = [];
        let removed = false;
        for (const track of this.timeline.tracks) {
            const filtered = track.keyframes.filter((k) => Math.abs(k.t - time) >= tolerance);
            if (filtered.length !== track.keyframes.length) {
                removed = true;
            }
            if (filtered.length > 0) {
                next.push({ ...track, keyframes: filtered });
            }
        }
        if (!removed) {
            return;
        }
        this.timeline.tracks = next;
        this.recomputeAnimatedParts();
        this.emit("timeline-tracks-changed", { trackCount: this.timeline.tracks.length, property: null });
        this.applyCursor(this.cursorMs, false);
    }

    /** Wipe every track. Doesn't touch the cursor or playback state. */
    clearAllKeyframes(): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.tracks = [];
        this.recomputeAnimatedParts();
        this.emit("timeline-tracks-changed", { trackCount: 0, property: null });
        this.applyCursor(this.cursorMs, false);
    }

    /** Distinct preset ids currently tagged on any keyframe in this timeline. */
    getActivePresetIds(): string[] {
        if (!this.timeline) {
            return [];
        }
        const ids = new Set<string>();
        for (const track of this.timeline.tracks) {
            for (const kf of track.keyframes) {
                if (kf.presetId) {
                    ids.add(kf.presetId);
                }
            }
        }
        return [...ids];
    }

    moveKeyframes(fromMs: number, toMs: number): void {
        if (!this.timeline) {
            return;
        }
        const epsilon = 0.5;
        const clampedTo = clampCursor(toMs, this.timeline);
        if (Math.abs(clampedTo - fromMs) < epsilon) {
            return;
        }
        let anyMoved = false;
        for (const track of this.timeline.tracks) {
            const movingIdx: number[] = [];
            for (let i = 0; i < track.keyframes.length; i++) {
                if (Math.abs(track.keyframes[i].t - fromMs) < epsilon) {
                    movingIdx.push(i);
                }
            }
            if (movingIdx.length === 0) {
                continue;
            }
            // Drop any pre-existing keyframes at the destination so the
            // moved ones overwrite them (the drag is the user's clear intent).
            track.keyframes = track.keyframes.filter((k, i) => {
                const isMover = movingIdx.includes(i);
                if (isMover) {
                    return true;
                }
                return Math.abs(k.t - clampedTo) >= epsilon;
            });
            for (const kf of track.keyframes) {
                if (Math.abs(kf.t - fromMs) < epsilon) {
                    kf.t = clampedTo;
                }
            }
            track.keyframes.sort((a, b) => a.t - b.t);
            anyMoved = true;
        }
        if (anyMoved) {
            this.emit("timeline-tracks-changed", {
                trackCount: this.timeline.tracks.length,
                property: null,
            });
            // Re-apply the cursor so the scene reflects the new keyframe layout.
            this.applyCursor(this.cursorMs, false);
        }
    }

    setKeyframe(propertyPath: string, timeMs: number, value: unknown): void {
        if (!this.timeline) {
            return;
        }
        const descriptor = getPathDescriptor(propertyPath);
        if (!descriptor) {
            return;
        }
        let track = this.timeline.tracks.find((t) => t.property === propertyPath);
        if (!track) {
            track = { property: propertyPath, type: descriptor.type, keyframes: [] };
            this.timeline.tracks.push(track);
        }
        const epsilon = 0.5;
        const existingIdx = track.keyframes.findIndex((k) => Math.abs(k.t - timeMs) < epsilon);
        if (existingIdx >= 0) {
            track.keyframes[existingIdx].v = value;
        } else {
            const insertAt = track.keyframes.findIndex((k) => k.t > timeMs);
            const keyframe = { t: timeMs, v: value };
            if (insertAt < 0) {
                track.keyframes.push(keyframe);
            } else {
                track.keyframes.splice(insertAt, 0, keyframe);
            }
        }
        this.recomputeAnimatedParts();
        this.emit("timeline-tracks-changed", {
            trackCount: this.timeline.tracks.length,
            property: propertyPath,
        });
    }

    seek(timeMs: number): void {
        this.applyCursor(timeMs, true);
    }

    private applyCursor(timeMs: number, rebaseTimebase: boolean): void {
        if (!this.timeline) {
            return;
        }
        const clamped = clampCursor(timeMs, this.timeline);
        this.cursorMs = clamped;
        if (rebaseTimebase && this.playing) {
            this.playStartMs = performance.now();
            this.playStartCursor = clamped;
        }
        // Build a minimal draft containing only the animated parts. Cloning
        // the full initial snapshot (16+ parts of nested settings) on every
        // tick churns the GC and the subsequent restore needlessly walks
        // every section. Only the parts with keyframes need to be touched.
        const draft: SceneSnapshot = {
            schemaVersion: this.timeline.initialSnapshot.schemaVersion,
            capturedAt: this.timeline.initialSnapshot.capturedAt,
            parts: {},
        };
        for (const partName of this.animatedParts) {
            const initialPart = this.timeline.initialSnapshot.parts[partName];
            if (initialPart !== undefined) {
                draft.parts[partName] = JSON.parse(JSON.stringify(initialPart));
            }
        }
        const smoothing = this.timeline.smoothing;
        for (const track of this.timeline.tracks) {
            const value = sampleTrack(track, clamped, smoothing);
            if (value !== undefined) {
                applyByPath(draft, track.property, value);
            }
        }
        this.deps.snapshot.restore(draft, { onlyParts: this.animatedParts });
        this.emit("timeline-seek", { timeMs: clamped });
    }

    play(): void {
        if (!this.timeline || this.playing) {
            return;
        }
        if (this.cursorMs >= this.timeline.durationMs && !this.timeline.loop) {
            this.cursorMs = 0;
        }
        this.playing = true;
        this.playStartMs = performance.now();
        this.playStartCursor = this.cursorMs;
        this.rafHandle = requestAnimationFrame(this.tick);
        this.emit("timeline-play", undefined);
    }

    pause(): void {
        const wasPlaying = this.playing;
        this.playing = false;
        if (this.rafHandle) {
            cancelAnimationFrame(this.rafHandle);
            this.rafHandle = 0;
        }
        if (wasPlaying) {
            this.emit("timeline-pause", undefined);
        }
    }

    togglePlay(): void {
        if (this.playing) {
            this.pause();
        } else {
            this.play();
        }
    }

    private emit<T>(type: string, detail: T): void {
        this.dispatchEvent(new CustomEvent<T>(type, { detail }));
    }

    private tick = (now: number): void => {
        if (!this.playing || !this.timeline) {
            return;
        }
        const elapsed = now - this.playStartMs;
        const raw = this.playStartCursor + elapsed;
        this.applyCursor(raw, false);
        if (raw >= this.timeline.durationMs && !this.timeline.loop) {
            this.pause();
            return;
        }
        this.rafHandle = requestAnimationFrame(this.tick);
    };
}

function clampCursor(timeMs: number, timeline: Timeline): number {
    if (timeline.durationMs <= 0) {
        return 0;
    }
    if (timeline.loop) {
        const m = timeMs % timeline.durationMs;
        return m < 0 ? m + timeline.durationMs : m;
    }
    if (timeMs < 0) {
        return 0;
    }
    if (timeMs > timeline.durationMs) {
        return timeline.durationMs;
    }
    return timeMs;
}

function sampleTrack(track: Track, timeMs: number, smoothing: boolean): unknown {
    const kfs = track.keyframes;
    if (kfs.length === 0) {
        return undefined;
    }
    if (timeMs <= kfs[0].t) {
        return kfs[0].v;
    }
    if (timeMs >= kfs[kfs.length - 1].t) {
        return kfs[kfs.length - 1].v;
    }
    // Find the segment [i, i+1] that contains timeMs.
    let i = 0;
    for (; i < kfs.length - 1; i++) {
        if (timeMs <= kfs[i + 1].t) {
            break;
        }
    }
    return interpolateKeyframes(track, i, timeMs, smoothing);
}

function interpolateKeyframes(track: Track, i: number, timeMs: number, smoothing: boolean): unknown {
    const kfs = track.keyframes;
    const a = kfs[i];
    const b = kfs[i + 1];
    if (b.t === a.t) {
        return b.v;
    }
    const rawAlpha = (timeMs - a.t) / (b.t - a.t);
    const easedAlpha = applyEase(b.ease, rawAlpha);
    if (!smoothing) {
        return interpolate(track.type, b.interp, a.v, b.v, easedAlpha);
    }
    // Clamp neighbours at the boundaries so the spline rests at the endpoints
    // (duplicating the boundary keyframe gives Catmull-Rom a tangent of half
    // the forward difference — natural "ease at the ends" behaviour).
    const p0 = i > 0 ? kfs[i - 1].v : a.v;
    const p3 = i + 2 < kfs.length ? kfs[i + 2].v : b.v;
    return smoothInterpolate(track.type, b.interp, p0, a.v, b.v, p3, easedAlpha);
}
