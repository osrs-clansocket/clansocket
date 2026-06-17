import type { SnapshotManager } from "../snapshot-manager.js";
import type { TimelineManager } from "../timeline-manager.js";
import { snapshotRegistry } from "../../../state/voxlab/registries/snapshot-registry.js";
import type { SceneSnapshot } from "../../../shared/types/voxlab/snapshot-types.js";
import { readByPath } from "../../../voxlab/timeline/property-paths.js";

const NUMBER_EPSILON = 1e-6;

export class KeyframeRecorderService {
    private enabled = false;
    private lastSnapshot: SceneSnapshot | null = null;

    constructor(
        private readonly timeline: TimelineManager,
        private readonly snapshot: SnapshotManager,
    ) {}

    setEnabled(active: boolean): void {
        this.enabled = active;
        if (active) {
            this.refreshBaseline();
        } else {
            this.lastSnapshot = null;
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    refreshBaseline(): void {
        this.lastSnapshot = this.snapshot.capture();
    }

    recordChange(): void {
        if (!this.enabled) {
            return;
        }
        if (this.snapshot.isRestoring) {
            return;
        }
        if (!this.timeline.hasTimeline()) {
            return;
        }
        const next = this.snapshot.capture();
        if (!this.lastSnapshot) {
            this.lastSnapshot = next;
            return;
        }
        const cursorMs = this.timeline.currentTimeMs;
        for (const path of snapshotRegistry.allPathStrings()) {
            const previous = readByPath(this.lastSnapshot, path);
            const current = readByPath(next, path);
            if (!this.valuesEqual(previous, current)) {
                this.timeline.setKeyframe(path, cursorMs, current);
            }
        }
        this.lastSnapshot = next;
    }

    private valuesEqual(a: unknown, b: unknown): boolean {
        if (a === b) {
            return true;
        }
        if (typeof a === "number" && typeof b === "number") {
            return Math.abs(a - b) <= NUMBER_EPSILON;
        }
        if (typeof a === "string" && typeof b === "string") {
            return a.toLowerCase() === b.toLowerCase();
        }
        return false;
    }
}
