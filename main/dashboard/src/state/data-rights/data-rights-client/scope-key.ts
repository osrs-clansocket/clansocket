import type { Scope, ScopeListItem } from "./index.js";

export function serverScopeKeyFor(s: ScopeListItem): string {
    if (s.kind === "clan" || s.kind === "clan_audit") return `${s.kind}:${s.clanId ?? ""}`;
    if (s.kind === "plugin") return `plugin:${s.clanId ?? ""}:${s.mode ?? ""}`;
    return s.kind;
}

export function scopeToScope(s: ScopeListItem): Scope {
    const out: Scope = { kind: s.kind };
    if (s.clanId !== undefined) out.clanId = s.clanId;
    if (s.mode !== undefined) out.mode = s.mode;
    return out;
}
