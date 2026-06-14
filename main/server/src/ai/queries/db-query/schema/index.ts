import { DB_NAMES, STATIC_DB_NAMES } from "../../../../database/index.js";
import { CHAIN_DB } from "../types.js";
import { appendClanDbSchema, appendPluginDbSchema, appendStaticDbSchema } from "./builders.js";
import { listAccessibleClans } from "./purpose.js";

export function getSchema(siteAccountId: string): string {
    const lines: string[] = [
        "Available databases. Wrong db = wasted turn. Plugin dbs require a 'clan' field on the query naming which clan to read from.\n",
    ];
    const clans = listAccessibleClans(siteAccountId);
    if (clans.length === 0) {
        lines.push("[no accessible clans — plugin telemetry not available for this user]");
        lines.push("");
    }
    for (const clan of clans) {
        appendClanDbSchema(lines, clan.id, clan.slug);
        appendPluginDbSchema(lines, clan.id, clan.slug);
    }
    appendStaticDbSchema(lines, CHAIN_DB);
    appendStaticDbSchema(lines, DB_NAMES.AI);
    appendStaticDbSchema(lines, STATIC_DB_NAMES.GAME_IDS);
    return lines.join("\n");
}
