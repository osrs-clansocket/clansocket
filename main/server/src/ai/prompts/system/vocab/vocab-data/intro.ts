export function header(): string {
    return '# data sources vocab\n\nevery query is a `{ db, sql, clan? }` object in the top-level `query` array. **always emit `read: ["db-schema"]` before authoring queries** — it returns the live list of accessible db kinds, accessible clans (where applicable), tables, and cols. nothing about the schema is pre-declared here.';
}

export function queryObjectDoctrine(): string {
    return [
        "- `db` — the db kind to query. db-schema lists which kinds are accessible to this player.",
        "- `sql` — SELECT only. blocked: INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/ATTACH/DETACH/PRAGMA/VACUUM/REINDEX. 50-row cap.",
        "- `clan` — clan slug (required when the db is clan-scoped or plugin-clan-scoped per db-schema; omit when global).",
    ].join("\n");
}

export function scopeRules(): string {
    return [
        "### scope is per-query",
        "",
        "- **one entity in one scope** → single query, filter in SQL.",
        "- **all entities in one scope** → single query, no filter.",
        "- **cross-scope compare** → multiple query objects in the same `query` array, one per scope.",
        "",
        "cross-scope shape:",
        "",
        "```json",
        '"query": [',
        '  { "db": "<kind>", "clan": "<slug-a>", "sql": "..." },',
        '  { "db": "<kind>", "clan": "<slug-b>", "sql": "..." }',
        "]",
        "```",
    ].join("\n");
}
