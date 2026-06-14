import type { CheckOp, PressKeyOp, SelectOptionOp, SetValueOp, ToggleOpenOp } from "../../types.js";
import { isNonEmptyString } from "./pickers.js";

export function normalizeSetValueOp(raw: unknown): SetValueOp | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as { target?: unknown; value?: unknown };
    if (!isNonEmptyString(r.target)) return null;
    const value = typeof r.value === "string" ? r.value : String(r.value ?? "");
    return { target: r.target, value };
}

export function normalizeCheckOp(raw: unknown): CheckOp | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as { target?: unknown; checked?: unknown };
    if (!isNonEmptyString(r.target) || typeof r.checked !== "boolean") return null;
    return { target: r.target, checked: r.checked };
}

export function normalizeSelectOptionOp(raw: unknown): SelectOptionOp | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as { target?: unknown; value?: unknown };
    if (!isNonEmptyString(r.target) || typeof r.value !== "string") return null;
    return { target: r.target, value: r.value };
}

export function normalizePressKeyOp(raw: unknown): PressKeyOp | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as { target?: unknown; key?: unknown };
    if (!isNonEmptyString(r.target) || !isNonEmptyString(r.key)) return null;
    return { target: r.target, key: r.key };
}

export function normalizeToggleOpenOp(raw: unknown): ToggleOpenOp | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as { target?: unknown; open?: unknown };
    if (!isNonEmptyString(r.target) || typeof r.open !== "boolean") return null;
    return { target: r.target, open: r.open };
}
