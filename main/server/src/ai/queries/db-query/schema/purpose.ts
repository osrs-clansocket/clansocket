import { DB_NAMES, STATIC_DB_NAMES } from "../../../../database/index.js";
import { listUserScopes } from "../../../../data-rights/scopes/scopes/index.js";
import { CHAIN_DB } from "../types.js";

export const DB_PURPOSE: Record<string, string> = {
    [CHAIN_DB]: "ur own chain history (this user's past turns, scoped via 'chain_steps' view; SELECT only)",
    [DB_NAMES.AI]: "ur own state (action log + persistent vars). NOT user data.",
    [STATIC_DB_NAMES.GAME_IDS]:
        "static OSRS catalog. tables: items (item_id PK, name, stackable/tradeable/noted bools, linked_note_id), objects (object_id PK, name), npcs (npc_id PK, name), game_ids_meta (row counts + build provenance). use for id→name resolution when plugin telemetry surfaces a bare id.",
};

export const PLUGIN_PURPOSE_NOTE =
    "live plugin telemetry stream. each plugin query must carry a 'clan' field naming the clan to read from. tier 1 = current state (UPSERT, fresh per event), tier 2 = append-only event log, tier 3 = bucketed aggregates. **THIS is the source for any 'monitor / now / live / tracking' question.** rotate tables — don't loop on the same query.";

export const CLAN_PURPOSE_NOTE =
    "clan-wide tables (mode-independent). holds clan roster snapshots, clan chat history, configured rank titles + change audit, account rsn history. each clan query must carry a 'clan' field naming the clan to read from.";

export function listAccessibleClans(siteAccountId: string): { id: string; slug: string; displayName: string }[] {
    const seen = new Map<string, { id: string; slug: string; displayName: string }>();
    for (const item of listUserScopes(siteAccountId)) {
        if (item.kind !== "plugin" || item.clanId === undefined || item.clanSlug === undefined) continue;
        if (!seen.has(item.clanId)) {
            seen.set(item.clanId, { id: item.clanId, slug: item.clanSlug, displayName: item.label });
        }
    }
    return Array.from(seen.values());
}
