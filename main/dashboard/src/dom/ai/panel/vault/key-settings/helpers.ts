import { label, span } from "../../../../factory/content-ops/index.js";
import type { Instance } from "../../../../factory/index.js";
import {
    FIELD_CLASS,
    FIELD_LABEL_CLASS,
    KEY_PREFIX_LEN,
    KEY_SHORT_THRESHOLD,
    KEY_SUFFIX_LEN,
    SNAP_POINTS,
    SNAP_TOLERANCE,
} from "./constants.js";

const REDACTION_DOTS = 8;

export function describeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

export function applyNearSnap(value: number): number {
    for (const point of SNAP_POINTS) {
        if (Math.abs(value - point) < SNAP_TOLERANCE) return point;
    }
    return value;
}

export function redactKey(key: string): string {
    if (key.length <= KEY_SHORT_THRESHOLD) return "•".repeat(Math.max(REDACTION_DOTS, key.length));
    return key.slice(0, KEY_PREFIX_LEN) + "•".repeat(REDACTION_DOTS) + key.slice(-KEY_SUFFIX_LEN);
}

export function priorityWord(idx: number): string {
    if (idx === 0) return "primary";
    if (idx === 1) return "secondary";
    if (idx === 2) return "tertiary";
    return `#${idx + 1}`;
}

export function buildField(labelText: string, child: Instance<HTMLElement>): Instance<HTMLLabelElement> {
    return label({ classes: [FIELD_CLASS], context: null, meta: null }, [
        span({ classes: [FIELD_LABEL_CLASS], text: labelText, context: null, meta: null }),
        child,
    ]);
}
