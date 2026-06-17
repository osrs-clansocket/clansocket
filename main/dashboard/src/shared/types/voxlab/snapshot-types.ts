export const SNAPSHOT_SCHEMA_VERSION = 13 as const;

export interface SceneSnapshot {
    schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
    capturedAt: number;
    parts: Record<string, unknown>;
}
