import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
    getClanDb,
    getClanPluginDb,
    getDb,
    getStaticDb,
    listClanPluginModes,
    PLUGIN_DB_PREFIX,
    STATIC_DB_NAMES,
} from "../../../../database/index.js";
import { CHAIN_DB, CHAIN_VIEW, CLAN_DB } from "../types.js";
import { CLAN_PURPOSE_NOTE, DB_PURPOSE, PLUGIN_PURPOSE_NOTE } from "./purpose.js";

const STATIC_CATALOG_DBS = new Set<string>(Object.values(STATIC_DB_NAMES));

// per-table per-column semantic notes (enum sets, sign conventions, NULL-when caveats),
// build-gen from scripts/script-data/field-rules.mjs via `npm run sync:db-semantics`.
const SEMANTICS_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../prompts/auto-gen/db-semantics.json");

function loadDbSemantics(): Record<string, Record<string, string>> {
    try {
        return JSON.parse(readFileSync(SEMANTICS_PATH, "utf-8")) as Record<string, Record<string, string>>;
    } catch {
        return {};
    }
}

const DB_SEMANTICS = loadDbSemantics();

type Db = ReturnType<typeof getDb>;
interface PragmaCol {
    name: string;
    type: string;
}

function listTables(db: Db): { name: string }[] {
    return db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { name: string }[];
}

// graceful merge: annotate a live column only where field-rules carries a matching table.col
// note. field-rules is the target spec, PRAGMA is the live db — divergence yields no note, never a wrong one.
function appendTableCols(lines: string[], db: Db, tableName: string): void {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as PragmaCol[];
    lines.push(`  ${tableName}: ${cols.map((c) => `${c.name} ${c.type}`).join(", ")}`);
    const sem = DB_SEMANTICS[tableName];
    if (sem) {
        const noted = cols.filter((c) => sem[c.name]).map((c) => `${c.name} (${sem[c.name]})`);
        if (noted.length > 0) lines.push(`    semantics: ${noted.join("; ")}`);
    }
}

export function appendClanDbSchema(lines: string[], clanId: string, clanSlug: string): void {
    try {
        const db = getClanDb(clanId);
        lines.push(`[${CLAN_DB} clan=${clanSlug}] — ${CLAN_PURPOSE_NOTE}`);
        for (const t of listTables(db)) appendTableCols(lines, db, t.name);
        lines.push("");
    } catch {
        lines.push(`[${CLAN_DB} clan=${clanSlug}] (not initialized)`);
        lines.push("");
    }
}

export function appendPluginDbSchema(lines: string[], clanId: string, clanSlug: string): void {
    for (const mode of listClanPluginModes(clanId)) {
        const dbName = `${PLUGIN_DB_PREFIX}${mode}`;
        try {
            const db = getClanPluginDb(clanId, mode);
            lines.push(`[${dbName} clan=${clanSlug}] — ${PLUGIN_PURPOSE_NOTE}`);
            for (const t of listTables(db)) appendTableCols(lines, db, t.name);
            lines.push("");
        } catch {
            lines.push(`[${dbName} clan=${clanSlug}] (not initialized)`);
            lines.push("");
        }
    }
}

export function appendStaticDbSchema(lines: string[], dbName: string): void {
    if (dbName === CHAIN_DB) {
        lines.push(`[${CHAIN_DB}] — ${DB_PURPOSE[CHAIN_DB]}`);
        lines.push(
            `  ${CHAIN_VIEW}: chain_id TEXT, step INTEGER, mode TEXT, loaded_context TEXT, reads TEXT, queries TEXT, recap TEXT, started_at INTEGER, completed_at INTEGER`,
        );
        lines.push("");
        return;
    }
    try {
        const db = STATIC_CATALOG_DBS.has(dbName) ? getStaticDb(dbName) : getDb(dbName);
        lines.push(`[${dbName}] — ${DB_PURPOSE[dbName] ?? ""}`);
        for (const t of listTables(db)) appendTableCols(lines, db, t.name);
        lines.push("");
    } catch {
        lines.push(`[${dbName}] (not initialized)`);
        lines.push("");
    }
}
