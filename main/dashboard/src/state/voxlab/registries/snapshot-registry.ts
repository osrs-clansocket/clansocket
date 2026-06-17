import type { TrackType } from "../../../shared/types/voxlab/timeline-types.js";

export interface PathSpec {
    suffix: string;
    type: TrackType;
    read: (state: unknown) => unknown;
    write: (state: unknown, value: unknown) => void;
}

export interface SnapshotPart<TState = unknown> {
    name: string;
    getState: () => TState;
    applyState: (state: TState, opts?: { silent?: boolean }) => void;
    paths: ReadonlyArray<PathSpec>;
}

export class SnapshotRegistry {
    private readonly parts = new Map<string, SnapshotPart>();

    register<T>(part: SnapshotPart<T>): void {
        this.parts.set(part.name, part as SnapshotPart);
    }

    deregister(name: string): void {
        this.parts.delete(name);
    }

    get(name: string): SnapshotPart | undefined {
        return this.parts.get(name);
    }

    all(): ReadonlyArray<SnapshotPart> {
        return [...this.parts.values()];
    }

    has(name: string): boolean {
        return this.parts.has(name);
    }

    allPathStrings(): ReadonlyArray<string> {
        const out: string[] = [];
        for (const part of this.parts.values()) {
            for (const spec of part.paths) {
                out.push(`${part.name}.${spec.suffix}`);
            }
        }
        return out;
    }
}

export const snapshotRegistry = new SnapshotRegistry();

export function pathNumber(suffix: string, key: string): PathSpec {
    return {
        suffix,
        type: "number",
        read: (s) => (s as Record<string, unknown>)[key],
        write: (s, v) => {
            (s as Record<string, unknown>)[key] = v as number;
        },
    };
}

export function pathColor(suffix: string, key: string): PathSpec {
    return {
        suffix,
        type: "color",
        read: (s) => (s as Record<string, unknown>)[key],
        write: (s, v) => {
            (s as Record<string, unknown>)[key] = v as string;
        },
    };
}

export function pathStep(suffix: string, key: string): PathSpec {
    return {
        suffix,
        type: "step",
        read: (s) => (s as Record<string, unknown>)[key],
        write: (s, v) => {
            (s as Record<string, unknown>)[key] = v;
        },
    };
}

export function nestedPath(
    prefix: string,
    descend: (state: unknown) => Record<string, unknown> | undefined,
    inner: PathSpec,
): PathSpec {
    return {
        suffix: `${prefix}.${inner.suffix}`,
        type: inner.type,
        read: (s) => {
            const target = descend(s);
            return target !== undefined ? inner.read(target) : undefined;
        },
        write: (s, v) => {
            const target = descend(s);
            if (target !== undefined) {
                inner.write(target, v);
            }
        },
    };
}

export function indexedNumberPath(
    suffix: string,
    descend: (state: unknown) => number[] | undefined,
    index: number,
): PathSpec {
    return {
        suffix,
        type: "number",
        read: (s) => {
            const arr = descend(s);
            return arr !== undefined ? arr[index] : undefined;
        },
        write: (s, v) => {
            const arr = descend(s);
            if (arr !== undefined) {
                arr[index] = v as number;
            }
        },
    };
}
