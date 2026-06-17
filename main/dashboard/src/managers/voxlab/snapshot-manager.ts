import { snapshotRegistry, type SnapshotRegistry } from "../../state/voxlab/registries/snapshot-registry.js";
import { SNAPSHOT_SCHEMA_VERSION, type SceneSnapshot } from "../../shared/types/voxlab/snapshot-types.js";

// Per-instance registry support: multi-renderer pages (e.g. several voxlab
// clan-avatars + a tweaker preview) need each renderer to animate ITS OWN
// sections. The global `snapshotRegistry` is a module singleton that gets
// clobbered every time a FooterPanelComponent constructs — last-one-wins.
// SnapshotManager accepts an optional registry override so each renderer
// can route capture/restore against its own footer's captured registry.
export class SnapshotManager {
    private restoring = false;
    private readonly registry: SnapshotRegistry;

    constructor(registry: SnapshotRegistry = snapshotRegistry) {
        this.registry = registry;
    }

    get isRestoring(): boolean {
        return this.restoring;
    }

    capture(): SceneSnapshot {
        const parts: Record<string, unknown> = {};
        for (const part of this.registry.all()) {
            parts[part.name] = part.getState();
        }
        return {
            schemaVersion: SNAPSHOT_SCHEMA_VERSION,
            capturedAt: Date.now(),
            parts,
        };
    }

    restore(snapshot: SceneSnapshot, opts?: { onlyParts?: ReadonlySet<string> }): void {
        this.restoring = true;
        try {
            for (const part of this.registry.all()) {
                // Timeline playback restricts the restore to parts that have
                // keyframes; everything else stays at its current value and
                // skips the DOM + change-event + renderer-mutation work.
                if (opts?.onlyParts && !opts.onlyParts.has(part.name)) {
                    continue;
                }
                const state = snapshot.parts[part.name];
                if (state !== undefined) {
                    part.applyState(state);
                }
            }
        } finally {
            this.restoring = false;
        }
    }
}
