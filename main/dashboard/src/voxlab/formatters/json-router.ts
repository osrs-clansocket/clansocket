export type DetectedJsonKind = "mesh" | "snapshot" | "timeline" | "unknown";

export interface SniffResult {
    kind: DetectedJsonKind;
    parsed: unknown;
}

export function sniffJson(jsonText: string): SniffResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return { kind: "unknown", parsed: null };
    }
    return { kind: detectJsonKind(parsed), parsed };
}

export function detectJsonKind(value: unknown): DetectedJsonKind {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return "unknown";
    }
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.positions) && Array.isArray(v.indices) && typeof v.metadata === "object") {
        return "mesh";
    }
    if (typeof v.schemaVersion === "number" && Array.isArray(v.tracks) && typeof v.initialSnapshot === "object") {
        return "timeline";
    }
    if (typeof v.schemaVersion === "number" && (isObject(v.parts) || isObject(v.sections))) {
        return "snapshot";
    }
    return "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
