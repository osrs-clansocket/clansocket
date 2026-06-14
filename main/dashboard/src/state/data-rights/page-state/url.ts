import type { ScopeListItem } from "../data-rights-client/index.js";
import type { PageState } from "./types.js";

const URL_DB = "db";
const URL_TABLE = "table";
const URL_CLAN = "clan";
const URL_MODE = "mode";
const URL_FROM = "from";
const URL_TO = "to";

export function writeUrl(state: PageState): void {
    const p = new URLSearchParams();
    if (state.scopeItem) {
        p.set(URL_DB, state.scopeItem.kind);
        if (state.scopeItem.clanId) p.set(URL_CLAN, state.scopeItem.clanId);
        if (state.scopeItem.mode) p.set(URL_MODE, state.scopeItem.mode);
    }
    if (state.table) p.set(URL_TABLE, state.table);
    if (state.from !== null) p.set(URL_FROM, String(state.from));
    if (state.to !== null) p.set(URL_TO, String(state.to));
    const q = p.toString();
    history.replaceState(null, "", q ? `/data-rights?${q}` : "/data-rights");
}

export function readUrl(scopes: ScopeListItem[]): {
    scope: ScopeListItem | null;
    table: string | null;
    from: number | null;
    to: number | null;
} {
    const params = new URLSearchParams(location.search);
    const kind = params.get(URL_DB);
    const clan = params.get(URL_CLAN);
    const mode = params.get(URL_MODE);
    const scope =
        scopes.find((s) => s.kind === kind && (s.clanId ?? "") === (clan ?? "") && (s.mode ?? "") === (mode ?? "")) ??
        null;
    const table = params.get(URL_TABLE);
    const tableValid =
        scope &&
        table &&
        scope.tables.some((t) => {
            const tn = typeof t === "string" ? t : t.name;
            const hr = typeof t === "string" ? true : t.hasRows;
            return tn === table && hr;
        })
            ? table
            : null;
    const fromRaw = params.get(URL_FROM);
    const toRaw = params.get(URL_TO);
    return {
        scope,
        table: tableValid,
        from: fromRaw ? Number.parseInt(fromRaw, 10) : null,
        to: toRaw ? Number.parseInt(toRaw, 10) : null,
    };
}
