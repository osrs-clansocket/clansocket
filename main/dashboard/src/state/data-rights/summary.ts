import { tableMeta, type TableSummary } from "./table-meta.js";

const HEURISTIC_FIELDS = [
    "title",
    "name",
    "kind",
    "rsn",
    "label",
    "status",
    "message",
    "body",
    "source",
    "action",
    "role",
];
const TRUNCATE_AT = 60;
const MS_EPOCH_MIN = 1_000_000_000_000;
const ISO_DATETIME_LEN = 19;
const MAX_VALUE_LEN_FACTOR = 4;

function truncate(s: string): string {
    if (s.length <= TRUNCATE_AT) return s;
    return `${s.slice(0, TRUNCATE_AT - 1)}…`;
}

function formatVal(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "number" && v > MS_EPOCH_MIN)
        return new Date(v).toISOString().replace("T", " ").slice(0, ISO_DATETIME_LEN);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

function field(row: Record<string, unknown>, col: string): string {
    if (!col) return "";
    return truncate(formatVal(row[col]));
}

function isIntegerString(s: string): boolean {
    const body = s.startsWith("-") ? s.slice(1) : s;
    if (body.length === 0) return false;
    for (const ch of body) {
        if (ch < "0" || ch > "9") return false;
    }
    return true;
}

function heuristicPrimary(row: Record<string, unknown>, secrets: ReadonlySet<string>): string {
    for (const f of HEURISTIC_FIELDS) {
        if (secrets.has(f)) continue;
        const v = formatVal(row[f]);
        if (v.length > 0) return truncate(v);
    }
    for (const [k, v] of Object.entries(row)) {
        if (secrets.has(k)) continue;
        const s = formatVal(v);
        if (s.length === 0) continue;
        if (isIntegerString(s)) continue;
        if (s.length > MAX_VALUE_LEN_FACTOR * MS_EPOCH_MIN.toString().length) continue;
        return truncate(s);
    }
    return "";
}

export interface RowSummary {
    primary: string;
    secondary: string;
    meta: string;
}

export interface RowSummaryOpts {
    table: string;
    row: Record<string, unknown>;
    pkCols: readonly string[];
    tsCol: string | null;
    secretColumns: readonly string[];
}

export function rowSummary({ table, row, pkCols, tsCol, secretColumns }: RowSummaryOpts): RowSummary {
    const meta = tableMeta(table);
    const sum: TableSummary | undefined = meta.summary;
    const secrets = new Set(secretColumns);
    const used = new Set<string>();
    let primary = "";
    let secondary = "";
    let updated = "";
    if (sum) {
        for (const c of [sum.primary, sum.secondary, sum.updated]) if (c) used.add(c);
        primary = field(row, sum.primary);
        secondary = field(row, sum.secondary);
        updated = field(row, sum.updated);
    }
    if (!primary) primary = heuristicPrimary(row, secrets);
    if (!primary && pkCols.length > 0) primary = pkCols.map((c) => formatVal(row[c])).join(" · ");
    if (!primary) primary = "row";
    const metaTs = updated || (tsCol && !used.has(tsCol) ? formatVal(row[tsCol]) : "");
    return { primary, secondary, meta: metaTs };
}
