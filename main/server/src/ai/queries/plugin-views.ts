import type { Database } from "better-sqlite3";
import type { ClanPosture } from "../../database/index.js";
import {
    PLUGIN_USER_TABLES,
    PLUGIN_USER_CHILD_TABLES,
    PLUGIN_CATALOG_TABLES,
} from "../../data-rights/scopes/manifest/index.js";

// AI query gate over the per-clan plugin db. The AI authors SQL against
// `v_<table>` views which the gate sets up per-request based on the calling
// user's posture in the active clan.
//
// Today every posture (owner / manager / member) maps to the clan_public
// visibility tier — full table contents, no per-user filter. Future tiers
// (self-scope for ex-members or restricted contexts) would add account_hash
// filters at view-creation time.

const VIEW_PREFIX = "v_";

export function viewNameFor(table: string): string {
    return `${VIEW_PREFIX}${table}`;
}

function allTableNames(): string[] {
    const out: string[] = [];
    for (const e of PLUGIN_USER_TABLES) out.push(e.table);
    for (const e of PLUGIN_USER_CHILD_TABLES) out.push(e.table);
    for (const t of PLUGIN_CATALOG_TABLES) out.push(t);
    return out;
}

export function allowedPluginViewNames(): Set<string> {
    const names = new Set<string>();
    for (const t of allTableNames()) names.add(viewNameFor(t));
    return names;
}

export function setupPluginViews(db: Database, _posture: ClanPosture): void {
    for (const table of allTableNames()) {
        const view = viewNameFor(table);
        db.exec(`DROP VIEW IF EXISTS ${view}`);
        db.exec(`CREATE TEMP VIEW ${view} AS SELECT * FROM ${table}`);
    }
}
