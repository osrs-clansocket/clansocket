import { snapshotRegistry } from "../../state/voxlab/registries/snapshot-registry.js";
import type { SceneSnapshot } from "../../shared/types/voxlab/snapshot-types.js";
import type { TrackType } from "../../shared/types/voxlab/timeline-types.js";

export interface PathDescriptor {
    type: TrackType;
    apply: (draft: SceneSnapshot, value: unknown) => void;
    read: (snap: SceneSnapshot) => unknown;
}

export function getPathDescriptor(path: string): PathDescriptor | null {
    const firstDot = path.indexOf(".");
    if (firstDot < 0) {
        return null;
    }
    const partName = path.slice(0, firstDot);
    const suffix = path.slice(firstDot + 1);
    const part = snapshotRegistry.get(partName);
    if (!part) {
        return null;
    }
    const spec = part.paths.find((p) => p.suffix === suffix);
    if (!spec) {
        return null;
    }
    return {
        type: spec.type,
        apply: (draft, value) => {
            const partState = draft.parts[partName];
            if (partState !== undefined) {
                spec.write(partState, value);
            }
        },
        read: (snap) => {
            const partState = snap.parts[partName];
            return partState !== undefined ? spec.read(partState) : undefined;
        },
    };
}

export function isAllowedPath(path: string): boolean {
    return getPathDescriptor(path) !== null;
}

export function applyByPath(draft: SceneSnapshot, path: string, value: unknown): void {
    getPathDescriptor(path)?.apply(draft, value);
}

export function readByPath(snap: SceneSnapshot, path: string): unknown {
    return getPathDescriptor(path)?.read(snap);
}

export function allowedPathList(): ReadonlyArray<string> {
    return snapshotRegistry.allPathStrings();
}
