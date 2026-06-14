const TYPE_QUERY = "query";
const TYPE_CHAIN = "chain";
const TYPE_READ = "read";
const TYPE_ACTION = "action";
const TYPE_PIN = "pin";
const TYPE_UNPIN = "unpin";
const TYPE_MEMORY = "memory";
const SQL_PREVIEW_LEN = 60;
const MSG_PREVIEW_LEN = 80;

type Payload = Record<string, unknown>;

const slicedField = (field: string) => (p: Payload) => String(p[field] ?? "").slice(0, MSG_PREVIEW_LEN);
const lengthExceedsPreview = (field: string) => (p: Payload) => String(p[field] ?? "").length > MSG_PREVIEW_LEN;

function formatQueryRows(data: Payload[]): string {
    if (data.length === 0) return "(no rows)";
    const cols = Object.keys(data[0]!);
    const header = cols.join(" | ");
    const rows = data.map((r) => cols.map((c) => String(r[c] ?? "")).join(" | "));
    return [header, ...rows].join("\n");
}

function summarizeQuery(p: Payload): string {
    const err = p.error ? `error: ${p.error}` : `${p.rows} rows`;
    return `${p.db}: ${String(p.sql).slice(0, SQL_PREVIEW_LEN)} — ${err}`;
}

interface EventDef {
    label: string;
    summarize: (p: Payload) => string;
    hasDetail?: (p: Payload) => boolean;
    detail?: (p: Payload) => string;
}

function eventDef(
    label: string,
    summarize: (p: Payload) => string,
    has?: (p: Payload) => boolean,
    render?: (p: Payload) => string,
): EventDef {
    if (has && render) return { label, summarize, hasDetail: has, detail: render };
    return { label, summarize };
}

const EVENTS: Record<string, EventDef> = {
    [TYPE_QUERY]: eventDef(
        "Query",
        summarizeQuery,
        (p) => !!(p.data as unknown[])?.length || !!p.error,
        (p) => (p.error ? String(p.error) : formatQueryRows(p.data as Payload[])),
    ),
    [TYPE_CHAIN]: eventDef("Chain", slicedField("message"), lengthExceedsPreview("message"), (p) =>
        String(p.message ?? ""),
    ),
    [TYPE_READ]: eventDef(
        "Read",
        (p) => String(p.id ?? ""),
        (p) => !!p.content,
        (p) => String(p.content ?? ""),
    ),
    [TYPE_ACTION]: eventDef("Action", slicedField("result"), lengthExceedsPreview("result"), (p) =>
        String(p.result ?? ""),
    ),
    [TYPE_PIN]: eventDef("Pin", (p) => `Pinned: ${(p.ids as string[]).join(", ")}${p.auto ? " (auto)" : ""}`),
    [TYPE_UNPIN]: eventDef("Unpin", (p) => `Unpinned: ${(p.ids as string[]).join(", ")}`),
    [TYPE_MEMORY]: eventDef(
        "Memory",
        (p) => {
            const action = String(p.action ?? "?");
            const id = String(p.id ?? "?");
            if (p.ok === false) return `${action} failed — ${id}: ${String(p.error ?? "unknown error")}`;
            const suffix = p.pinned ? " (pinned)" : "";
            return `${action} ${id}${suffix}`;
        },
        (p) => !!p.error,
        (p) => String(p.error ?? ""),
    ),
};

function labelFor(type: string): string {
    return EVENTS[type]?.label ?? type;
}

function summaryLine(type: string, p: Payload): string {
    return EVENTS[type]?.summarize(p) ?? JSON.stringify(p).slice(0, MSG_PREVIEW_LEN);
}

function hasDetail(type: string, p: Payload): boolean {
    return EVENTS[type]?.hasDetail?.(p) ?? false;
}

function detailContent(type: string, p: Payload): string {
    return EVENTS[type]?.detail?.(p) ?? JSON.stringify(p, null, 2);
}

export { labelFor, summaryLine, hasDetail, detailContent, TYPE_CHAIN };
export type { Payload };
