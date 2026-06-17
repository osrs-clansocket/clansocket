import {
    LAYOUT_SCHEMA_VERSION,
    type LayoutEntry,
    type LayoutState,
} from "../../../shared/types/voxlab/layout-types.js";

const STORAGE_KEY = "voxlab.layout.v1";

export type LayoutMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, LayoutMigration> = {};

export class LayoutPersistenceService {
    load(): LayoutState | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!isObject(parsed)) {
                return null;
            }
            const migrated = applyMigrations(parsed as Record<string, unknown>);
            if (!isLayoutShape(migrated)) {
                return null;
            }
            return migrated;
        } catch {
            return null;
        }
    }

    save(state: LayoutState): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Storage may be disabled / quota exceeded — silently ignore.
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    }
}

function applyMigrations(raw: Record<string, unknown>): Record<string, unknown> {
    let current = raw;
    let safety = 0;
    while (typeof current.schemaVersion === "number" && current.schemaVersion < LAYOUT_SCHEMA_VERSION) {
        const migrate = MIGRATIONS[current.schemaVersion];
        if (!migrate) {
            throw new Error(
                `No layout migration registered from v${current.schemaVersion} to v${LAYOUT_SCHEMA_VERSION}`,
            );
        }
        current = migrate(current);
        safety++;
        if (safety > 16) {
            throw new Error("Layout migration loop detected");
        }
    }
    return current;
}

function isLayoutShape(value: unknown): value is LayoutState {
    if (!isObject(value)) {
        return false;
    }
    const v = value as Record<string, unknown>;
    if (v.schemaVersion !== LAYOUT_SCHEMA_VERSION) {
        return false;
    }
    return isEntryArray(v.left) && isEntryArray(v.right);
}

function isEntryArray(value: unknown): value is LayoutEntry[] {
    if (!Array.isArray(value)) {
        return false;
    }
    for (const entry of value) {
        if (!isObject(entry)) {
            return false;
        }
        const e = entry as Record<string, unknown>;
        if (typeof e.id !== "string" || typeof e.collapsed !== "boolean") {
            return false;
        }
    }
    return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
