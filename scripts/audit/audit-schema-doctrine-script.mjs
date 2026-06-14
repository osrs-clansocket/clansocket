#!/usr/bin/env node
// Schema doctrine gate (Who/What — invariant 1, Architecture rule 2):
// every catalog-entity `<base>_id` column must be paired with `<base>_name`
// IN THE SAME TABLE, so SQL answers "what was X" without a catalog join.
// Non-catalog identifiers (session/account/opaque ids) are exempt.
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { getSchemaCols } = require("../../shared/config/eslint-rules/schema-columns.cjs");

// catalog source-of-truth tables: the row IS the name (single `name` column),
// so the doctrine's `<base>_id` + `<base>_name` pairing does not apply here.
// Operational tables that REFERENCE these catalogs still must denormalize.
const EXEMPT_TABLES = new Set([
    "items",
    "objects",
    "npcs",
    "map_regions",
    "map_planes",
    "map_meta",
    "game_ids_meta",
]);

// `<base>` values whose `_id` is an opaque / FK / game identifier, not a
// denormalizable catalog entity — no `<base>_name` pairing expected.
const EXEMPT_BASES = new Set([
    "site_account",
    "actor_site_account",
    "added_by_site_account",
    "created_by_site_account",
    "granted_by_site_account",
    "owner_site_account",
    "redeemed_by_site_account",
    "requesting_site_account",
    "resolved_by_site_account",
    "updated_by_site_account",
    "chain",
    "credential",
    "death",
    "guild",
    "pin",
    "provider_user",
    "request",
    "session",
    "last_session",
    "user",
    "varbit",
    "last_damage_dealt_hitsplat",
    "last_damage_taken_hitsplat",
    "cause_target",
    "last_menu_action_target",
    "shard",
    "interaction",
    "token_key",
    "queue",
    "response_message",
    "change",
    "dep",
    "dependency_change",
    "dependency_temp",
    "op",
    "base_snapshot",
    "application",
    "audit_entry",
    "gated_by_flow",
    "webhook",
    "active_presence_template",
    "ws_session",
]);

// `<base>:<table>` pairs where the table's `<base>_id` is the row PK AND the
// table carries the entity name under a bare `name` column — the W/W/W/W
// pairing is satisfied without the literal `<base>_name` form.
const EXEMPT_BASE_TABLE_PAIRS = new Set([
    "template:discord_message_templates",
    "preset:discord_presets",
    "template:discord_bot_presence_templates",
]);

const ID_SUFFIX = "_id";
const cols = getSchemaCols();
const violations = [];

for (const [table, set] of cols) {
    if (EXEMPT_TABLES.has(table)) continue;
    for (const col of set) {
        if (!col.endsWith(ID_SUFFIX)) continue;
        const base = col.slice(0, -ID_SUFFIX.length);
        if (EXEMPT_BASES.has(base)) continue;
        if (EXEMPT_BASE_TABLE_PAIRS.has(`${base}:${table}`)) continue;
        if (!set.has(`${base}_name`)) {
            violations.push(`  ${table}.${col} -> missing ${base}_name`);
        }
    }
}

if (violations.length > 0) {
    console.error("schema doctrine FAIL: catalog <entity>_id without <entity>_name pairing (invariant 1 / Architecture rule 2):");
    console.error(violations.join("\n"));
    console.error("\nfix: add the <entity>_name column (denormalized at write time), or add the base to EXEMPT_BASES if it is a non-catalog identifier.");
    process.exit(1);
}

console.log(`schema doctrine OK: ${cols.size} tables, every catalog <entity>_id is paired with <entity>_name.`);
