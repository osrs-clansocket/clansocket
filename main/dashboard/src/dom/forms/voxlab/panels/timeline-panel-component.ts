import { button, div, input, section, span, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { modalService } from "../../../../managers/voxlab/services/modal-service.js";
import { TRANSPORT_ICONS } from "../../../../shared/constants/voxlab/transport-icons.js";
import type { Timeline } from "../../../../shared/types/voxlab/timeline-types.js";
import {
    TIMELINE_PANEL_BTN_CLASS,
    TIMELINE_PANEL_BTN_LOOP_MOD,
    TIMELINE_PANEL_BUTTONS_CLASS,
    TIMELINE_PANEL_CLASS,
    TIMELINE_PANEL_KEYFRAME_ACTIONS_CLASS,
    TIMELINE_PANEL_KEYFRAME_BTN_CLASS,
    TIMELINE_PANEL_KEYFRAME_BTN_DANGER_MOD,
    TIMELINE_PANEL_MARKER_CLASS,
    TIMELINE_PANEL_MARKERS_CLASS,
    TIMELINE_PANEL_READOUT_CLASS,
    TIMELINE_PANEL_SCRUBBER_CLASS,
    TIMELINE_PANEL_TRANSPORT_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";

export interface TimelineSource {
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    readonly currentTimeMs: number;
    readonly durationMs: number;
    readonly isPlaying: boolean;
    readonly loop: boolean;
    readonly smoothing: boolean;
    readonly fps: number;
    hasTimeline(): boolean;
    getTimeline(): Timeline | null;
    play(): void;
    pause(): void;
    togglePlay(): void;
    seek(timeMs: number): void;
    stop(): void;
    seekToEnd(): void;
    stepFrame(direction: number): void;
    toggleLoop(): void;
    toggleSmoothing(): void;
    moveKeyframes(fromMs: number, toMs: number): void;
    snapAllAtCursor(): void;
    deleteKeyframesNearCursor(): void;
    clearAllKeyframes(): void;
}

const SCRUB_MAX = 10_000;
const DRAG_THRESHOLD_PX = 3;

interface TransportButtonSpec {
    icon: string;
    label: string;
    modifier: string;
    onClick: (source: TimelineSource) => void;
}

const TRANSPORT_BUTTONS: TransportButtonSpec[] = [
    { icon: TRANSPORT_ICONS.start, label: "Jump to start", modifier: "start", onClick: (s) => s.seek(0) },
    { icon: TRANSPORT_ICONS.prevFrame, label: "Previous frame", modifier: "prev", onClick: (s) => s.stepFrame(-1) },
    { icon: TRANSPORT_ICONS.play, label: "Play / Pause", modifier: "play", onClick: (s) => s.togglePlay() },
    { icon: TRANSPORT_ICONS.stop, label: "Stop", modifier: "stop", onClick: (s) => s.stop() },
    { icon: TRANSPORT_ICONS.nextFrame, label: "Next frame", modifier: "next", onClick: (s) => s.stepFrame(1) },
    { icon: TRANSPORT_ICONS.end, label: "Jump to end", modifier: "end", onClick: (s) => s.seekToEnd() },
    { icon: TRANSPORT_ICONS.loop, label: "Toggle loop", modifier: "loop", onClick: (s) => s.toggleLoop() },
    {
        icon: TRANSPORT_ICONS.smoothingCurve,
        label: "Toggle smoothing",
        modifier: "smoothing",
        onClick: (s) => s.toggleSmoothing(),
    },
];

export class TimelinePanelComponent extends BaseVoxlabComponent {
    private source: TimelineSource | null = null;
    private playInstance!: Instance<HTMLButtonElement>;
    private loopInstance!: Instance<HTMLButtonElement>;
    private smoothingInstance!: Instance<HTMLButtonElement>;
    private scrubberInstance!: Instance<HTMLInputElement>;
    private markerRailInstance!: Instance;
    private timeReadoutInstance!: Instance;
    private isUserScrubbing = false;
    private wasPlayingBeforeScrub = false;
    private listeners: Array<{ type: string; fn: EventListener }> = [];

    bind(source: TimelineSource): void {
        this.detach();
        this.source = source;
        const pairs: Array<[string, EventListener]> = [
            ["timeline-loaded", () => this.refresh()],
            ["timeline-unloaded", () => this.refresh()],
            ["timeline-play", () => this.refreshPlayState()],
            ["timeline-pause", () => this.refreshPlayState()],
            ["timeline-seek", (e: Event) => this.handleSeek(e)],
            ["timeline-loop-changed", () => this.refreshLoopState()],
            ["timeline-smoothing-changed", () => this.refreshSmoothingState()],
            ["timeline-tracks-changed", () => this.refreshMarkers()],
        ];
        for (const [type, fn] of pairs) {
            source.addEventListener(type, fn);
            this.listeners.push({ type, fn });
        }
        this.refresh();
    }

    private handleSeek(e: Event): void {
        if (this.isUserScrubbing) {
            return;
        }
        const detail = (e as CustomEvent<{ timeMs: number }>).detail;
        this.applyCursor(detail.timeMs);
    }

    detach(): void {
        if (!this.source) {
            return;
        }
        for (const { type, fn } of this.listeners) {
            this.source.removeEventListener(type, fn);
        }
        this.listeners = [];
        this.source = null;
    }

    protected build(): HTMLElement {
        const transport = this.buildTransport();
        this.markerRailInstance = div({
            classes: [TIMELINE_PANEL_MARKERS_CLASS],
            context: null,
            meta: null,
        });
        this.scrubberInstance = this.buildScrubber();
        const keyframeActions = this.buildKeyframeActions();
        const panel = section({ classes: [TIMELINE_PANEL_CLASS], context: null, meta: null }, [
            transport.el,
            this.markerRailInstance.el,
            this.scrubberInstance.el,
            keyframeActions.el,
        ]);
        this.refresh();
        return panel.el;
    }

    private buildTransport(): Instance {
        const buttonEls: HTMLElement[] = [];
        for (const spec of TRANSPORT_BUTTONS) {
            const btn = this.buildTransportButton(spec);
            if (spec.modifier === "play") {
                this.playInstance = btn;
            } else if (spec.modifier === "loop") {
                this.loopInstance = btn;
            } else if (spec.modifier === "smoothing") {
                this.smoothingInstance = btn;
            }
            buttonEls.push(btn.el);
        }
        const buttonRow = div({ classes: [TIMELINE_PANEL_BUTTONS_CLASS], context: null, meta: null }, buttonEls);
        this.timeReadoutInstance = span({
            classes: [TIMELINE_PANEL_READOUT_CLASS],
            text: "0.00s / 0.00s",
            context: null,
            meta: null,
        });
        return div({ classes: [TIMELINE_PANEL_TRANSPORT_CLASS], context: null, meta: null }, [
            buttonRow.el,
            this.timeReadoutInstance.el,
        ]);
    }

    private buildTransportButton(spec: TransportButtonSpec): Instance<HTMLButtonElement> {
        const modClass = spec.modifier === "loop" ? TIMELINE_PANEL_BTN_LOOP_MOD : null;
        const classes = modClass ? [TIMELINE_PANEL_BTN_CLASS, modClass] : [TIMELINE_PANEL_BTN_CLASS];
        const btn = button({
            classes,
            type: "button",
            title: spec.label,
            ariaLabel: spec.label,
            context: `voxlab timeline transport — ${spec.label.toLowerCase()}`,
            meta: ["action"],
            onClick: () => {
                if (this.source) {
                    spec.onClick(this.source);
                }
            },
        });
        // factory `setHTML` routes through DOMPurify which strips svg/path
        // elements; transport icons are trusted hardcoded SVG constants — bypass
        // the sanitizer for the raw inline assignment.
        btn.el.innerHTML = spec.icon;
        return btn;
    }

    private buildScrubber(): Instance<HTMLInputElement> {
        const scrubber = input({
            classes: ["voxlab__control-slider", TIMELINE_PANEL_SCRUBBER_CLASS],
            type: "range",
            min: "0",
            max: String(SCRUB_MAX),
            step: "1",
            value: "0",
            context: "voxlab timeline scrubber — drag to seek through the timeline",
            meta: ["input"],
            onInput: () => {
                const duration = this.source?.durationMs ?? 0;
                const t = (Number.parseFloat(scrubber.el.value) / SCRUB_MAX) * duration;
                this.updateReadout(t, duration);
                this.source?.seek(t);
            },
        });
        this.wireScrubberPointer(scrubber);
        return scrubber;
    }

    private wireScrubberPointer(scrubber: Instance<HTMLInputElement>): void {
        const el = scrubber.el;
        // pointer events have no factory wireXX helper; raw listener with
        // disable is the accepted escape hatch for drag-style interactions.
        el.addEventListener("pointerdown", () => {
            this.isUserScrubbing = true;
            this.wasPlayingBeforeScrub = this.source?.isPlaying ?? false;
            if (this.wasPlayingBeforeScrub) {
                this.source?.pause();
            }
        });
        const endScrub = (): void => {
            if (!this.isUserScrubbing) {
                return;
            }
            this.isUserScrubbing = false;
            if (this.wasPlayingBeforeScrub) {
                this.source?.play();
            }
            this.wasPlayingBeforeScrub = false;
        };
        el.addEventListener("pointerup", endScrub);
        el.addEventListener("pointercancel", endScrub);
    }

    private buildKeyframeActions(): Instance {
        const trackingBtn = button({
            classes: [TIMELINE_PANEL_KEYFRAME_BTN_CLASS],
            type: "button",
            text: "Start tracking",
            title: "Begin recording scene-property changes as keyframes",
            ariaLabel: "Toggle keyframe tracking",
            context: "voxlab timeline — toggle keyframe tracking on/off",
            meta: ["action"],
            onClick: () => {
                this.emit<{ active: boolean }>("toggle-tracking-requested", { active: !this.trackingActive });
            },
        });
        this.trackingInstance = trackingBtn;
        const addBtn = this.buildActionBtn("+ Key", "Snap all current values as keyframes at the cursor", () =>
            this.source?.snapAllAtCursor(),
        );
        const delBtn = this.buildActionBtn("− Key", "Delete keyframes within half a frame of the cursor", () =>
            this.source?.deleteKeyframesNearCursor(),
        );
        const clearBtn = button({
            classes: [TIMELINE_PANEL_KEYFRAME_BTN_CLASS, TIMELINE_PANEL_KEYFRAME_BTN_DANGER_MOD],
            type: "button",
            text: "Clear all",
            title: "Wipe every keyframe from every track",
            ariaLabel: "Wipe every keyframe from every track",
            context: "voxlab timeline — clear every keyframe across every track",
            meta: ["destructive"],
            onClick: () => {
                void this.confirmAndClear();
            },
        });
        return div({ classes: [TIMELINE_PANEL_KEYFRAME_ACTIONS_CLASS], context: null, meta: null }, [
            trackingBtn.el,
            addBtn.el,
            delBtn.el,
            clearBtn.el,
        ]);
    }

    /** keyframe-record mode toggle. inactive → "Start tracking" plain; active →
     *  "Stop tracking" with the danger-modifier class so the button reads as
     *  hot/recording. Called by voxlab-app-manager after it flips the recorder. */
    private trackingInstance!: Instance<HTMLButtonElement>;
    private trackingActive = false;

    setTrackingActive(active: boolean): void {
        this.trackingActive = active;
        this.trackingInstance.setText(active ? "Stop tracking" : "Start tracking");
        this.trackingInstance.toggleClass(TIMELINE_PANEL_KEYFRAME_BTN_DANGER_MOD, active);
    }

    private buildActionBtn(label: string, tooltip: string, onClick: () => void): Instance<HTMLButtonElement> {
        return button({
            classes: [TIMELINE_PANEL_KEYFRAME_BTN_CLASS],
            type: "button",
            text: label,
            title: tooltip,
            ariaLabel: tooltip,
            context: `voxlab timeline keyframe action — ${tooltip.toLowerCase()}`,
            meta: ["action"],
            onClick,
        });
    }

    private async confirmAndClear(): Promise<void> {
        const ok = await modalService.confirm("Wipe every keyframe from every track?", {
            danger: true,
            confirmLabel: "Clear",
        });
        if (ok) {
            this.source?.clearAllKeyframes();
        }
    }

    protected onUnmount(): void {
        this.detach();
    }

    private refresh(): void {
        if (this.source?.hasTimeline()) {
            this.applyCursor(this.source.currentTimeMs);
            this.refreshPlayState();
            this.refreshLoopState();
            this.refreshSmoothingState();
            this.refreshMarkers();
        } else {
            this.scrubberInstance.el.value = "0";
            this.updateReadout(0, 0);
            this.playInstance.el.innerHTML = TRANSPORT_ICONS.play;
            this.loopInstance.setAttr("data-active", "false");
            this.smoothingInstance.el.innerHTML = TRANSPORT_ICONS.smoothingCurve;
            this.smoothingInstance.setAttr("data-active", "false");
            this.markerRailInstance.clear();
        }
    }

    private refreshPlayState(): void {
        const playing = this.source?.isPlaying ?? false;
        this.playInstance.el.innerHTML = playing ? TRANSPORT_ICONS.pause : TRANSPORT_ICONS.play;
        this.playInstance.setAttr("title", playing ? "Pause" : "Play");
        this.playInstance.setAttr("aria-label", playing ? "Pause" : "Play");
    }

    private refreshLoopState(): void {
        const looping = this.source?.loop ?? false;
        this.loopInstance.setAttr("data-active", looping ? "true" : "false");
    }

    private refreshSmoothingState(): void {
        const smooth = this.source?.smoothing ?? true;
        this.smoothingInstance.el.innerHTML = smooth ? TRANSPORT_ICONS.smoothingCurve : TRANSPORT_ICONS.smoothingLinear;
        this.smoothingInstance.setAttr("data-active", smooth ? "true" : "false");
        const next = smooth ? "linear" : "smooth";
        this.smoothingInstance.setAttr(
            "title",
            `Interpolation: ${smooth ? "smooth (curve)" : "linear (zigzag)"} — click for ${next}`,
        );
        this.smoothingInstance.setAttr("aria-label", `Switch to ${next} interpolation`);
    }

    private applyCursor(timeMs: number): void {
        const duration = this.source?.durationMs ?? 0;
        if (duration > 0) {
            this.scrubberInstance.el.value = String(Math.round((timeMs / duration) * SCRUB_MAX));
        } else {
            this.scrubberInstance.el.value = "0";
        }
        this.updateReadout(timeMs, duration);
    }

    private updateReadout(timeMs: number, durationMs: number): void {
        this.timeReadoutInstance.setText(`${(timeMs / 1000).toFixed(2)}s / ${(durationMs / 1000).toFixed(2)}s`);
    }

    private refreshMarkers(): void {
        if (!this.source) {
            this.markerRailInstance.clear();
            return;
        }
        const timeline = this.source.getTimeline();
        if (!timeline || timeline.durationMs <= 0) {
            this.markerRailInstance.clear();
            return;
        }
        const groups = collectKeyframeGroups(timeline);
        const sortedTimes = [...groups.keys()].sort((a, b) => a - b);
        const next: HTMLElement[] = [];
        for (const time of sortedTimes) {
            const items = groups.get(time);
            if (!items) {
                continue;
            }
            const markerInst = this.buildMarker(time, items, timeline.durationMs);
            next.push(markerInst.el);
        }
        this.markerRailInstance.setChildren(...next);
    }

    private buildMarker(
        time: number,
        items: Array<{ property: string; value: unknown }>,
        durationMs: number,
    ): Instance<HTMLButtonElement> {
        const pct = (time / durationMs) * 100;
        const lines = [`${(time / 1000).toFixed(2)}s`];
        for (const item of items) {
            lines.push(`${item.property}: ${formatValue(item.value)}`);
        }
        const titleText = lines.join("\n");
        const marker = button({
            classes: [TIMELINE_PANEL_MARKER_CLASS],
            type: "button",
            attrs: { style: `--marker-pos: ${pct}%` },
            title: titleText,
            ariaLabel: `Keyframe at ${(time / 1000).toFixed(2)}s`,
            context: `voxlab timeline marker — drag to reposition the keyframe at ${(time / 1000).toFixed(2)}s`,
            meta: ["action"],
        });
        this.attachMarkerDrag(marker, time, durationMs);
        return marker;
    }

    private attachMarkerDrag(marker: Instance<HTMLButtonElement>, originalTime: number, durationMs: number): void {
        const markerEl = marker.el;
        markerEl.addEventListener("pointerdown", (downEvent: PointerEvent) => {
            this.handleMarkerPointerDown(marker, downEvent, originalTime, durationMs);
        });
    }

    private handleMarkerPointerDown(
        marker: Instance<HTMLButtonElement>,
        downEvent: PointerEvent,
        originalTime: number,
        durationMs: number,
    ): void {
        if (downEvent.button !== 0 || !this.source) {
            return;
        }
        downEvent.preventDefault();
        downEvent.stopPropagation();
        const railRect = this.markerRailInstance.el.getBoundingClientRect();
        if (railRect.width <= 0 || durationMs <= 0) {
            return;
        }
        const fps = Math.max(1, this.source.fps);
        const frameMs = 1000 / fps;
        const dragState = { startX: downEvent.clientX, currentTime: originalTime, dragged: false };
        marker.setAttr("data-dragging", "true");
        try {
            marker.el.setPointerCapture(downEvent.pointerId);
        } catch {
            // capture can fail in unusual browser states; drag still works without it
        }
        this.wireMarkerDragHandlers(marker, dragState, downEvent, originalTime, durationMs, railRect, frameMs);
    }

    private wireMarkerDragHandlers(
        marker: Instance<HTMLButtonElement>,
        dragState: { startX: number; currentTime: number; dragged: boolean },
        downEvent: PointerEvent,
        originalTime: number,
        durationMs: number,
        railRect: DOMRect,
        frameMs: number,
    ): void {
        const markerEl = marker.el;
        const onMove = (moveEvent: PointerEvent): void => {
            this.onMarkerPointerMove(marker, moveEvent, dragState, originalTime, durationMs, railRect, frameMs);
        };
        const cleanup = (): void => {
            markerEl.removeEventListener("pointermove", onMove);
            markerEl.removeEventListener("pointerup", onUp);
            markerEl.removeEventListener("pointercancel", onCancel);
            marker.removeAttr("data-dragging");
            try {
                markerEl.releasePointerCapture(downEvent.pointerId);
            } catch {
                // ignore
            }
        };
        const onUp = (): void => {
            cleanup();
            if (dragState.dragged && Math.abs(dragState.currentTime - originalTime) >= 0.5) {
                this.source?.moveKeyframes(originalTime, dragState.currentTime);
            } else {
                this.source?.seek(originalTime);
            }
        };
        const onCancel = (): void => {
            cleanup();
            marker.setAttr("style", `--marker-pos: ${(originalTime / durationMs) * 100}%`);
        };
        markerEl.addEventListener("pointermove", onMove);
        markerEl.addEventListener("pointerup", onUp);
        markerEl.addEventListener("pointercancel", onCancel);
    }

    private onMarkerPointerMove(
        marker: Instance<HTMLButtonElement>,
        moveEvent: PointerEvent,
        dragState: { startX: number; currentTime: number; dragged: boolean },
        originalTime: number,
        durationMs: number,
        railRect: DOMRect,
        frameMs: number,
    ): void {
        const deltaPx = moveEvent.clientX - dragState.startX;
        if (!dragState.dragged && Math.abs(deltaPx) >= DRAG_THRESHOLD_PX) {
            dragState.dragged = true;
        }
        const deltaT = (deltaPx / railRect.width) * durationMs;
        const raw = originalTime + deltaT;
        const snapped = moveEvent.altKey ? raw : Math.round(raw / frameMs) * frameMs;
        const next = Math.max(0, Math.min(durationMs, snapped));
        dragState.currentTime = next;
        marker.setAttr("style", `--marker-pos: ${(next / durationMs) * 100}%`);
        marker.setAttr("title", `${(next / 1000).toFixed(2)}s · frame ${Math.round(next / frameMs)}`);
    }
}

function collectKeyframeGroups(timeline: Timeline): Map<number, Array<{ property: string; value: unknown }>> {
    const groups = new Map<number, Array<{ property: string; value: unknown }>>();
    for (const track of timeline.tracks) {
        for (const kf of track.keyframes) {
            const key = Math.round(kf.t);
            let bucket = groups.get(key);
            if (!bucket) {
                bucket = [];
                groups.set(key, bucket);
            }
            bucket.push({ property: track.property, value: kf.v });
        }
    }
    return groups;
}

function formatValue(value: unknown): string {
    if (typeof value === "number") {
        return trimTrailingZeros(value.toFixed(3));
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }
    return JSON.stringify(value);
}

function trimTrailingZeros(s: string): string {
    if (!s.includes(".")) {
        return s;
    }
    let end = s.length;
    while (end > 0 && s.charAt(end - 1) === "0") {
        end--;
    }
    if (end > 0 && s.charAt(end - 1) === ".") {
        end--;
    }
    return s.slice(0, end);
}
