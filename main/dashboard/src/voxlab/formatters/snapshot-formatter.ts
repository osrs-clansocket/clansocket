import type { SceneSnapshot } from "../../shared/types/voxlab/snapshot-types.js";

export function formatSnapshotAsJson(snapshot: SceneSnapshot): string {
    return JSON.stringify(snapshot);
}

export function snapshotFileName(stem: string): string {
    return `${stem}.snapshot.json`;
}
