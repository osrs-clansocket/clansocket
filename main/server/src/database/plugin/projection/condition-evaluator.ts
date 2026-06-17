export interface AutoHookCondition {
    field: string;
    op: string;
    value: string;
}

const OP_EQ = "eq";
const OP_NE = "ne";
const OP_GT = "gt";
const OP_GTE = "gte";
const OP_LT = "lt";
const OP_LTE = "lte";
const OP_CONTAINS = "contains";

function asString(v: unknown): string {
    return v === null || v === undefined ? "" : String(v);
}

function asNumber(v: unknown): number {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
}

function evaluateOne(payload: Record<string, unknown>, c: AutoHookCondition): boolean {
    const raw = payload[c.field];
    if (c.op === OP_EQ) return asString(raw) === c.value;
    if (c.op === OP_NE) return asString(raw) !== c.value;
    if (c.op === OP_CONTAINS) return asString(raw).toLowerCase().includes(c.value.toLowerCase());
    const left = asNumber(raw);
    const right = asNumber(c.value);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    if (c.op === OP_GT) return left > right;
    if (c.op === OP_GTE) return left >= right;
    if (c.op === OP_LT) return left < right;
    if (c.op === OP_LTE) return left <= right;
    return false;
}

export function evaluateConditions(conditionsJson: string | null, payload: object): boolean {
    if (conditionsJson === null || conditionsJson.length === 0) return true;
    try {
        const conditions = JSON.parse(conditionsJson) as AutoHookCondition[];
        if (!Array.isArray(conditions) || conditions.length === 0) return true;
        const p = payload as Record<string, unknown>;
        return conditions.every((c) => evaluateOne(p, c));
    } catch {
        return true;
    }
}
