import { EventEmitter } from "node:events";
import { SCOPE_APP, SCOPE_CLAN, SCOPE_CLAN_AUDIT, SCOPE_PLUGIN, SCOPE_VAREZ } from "../scopes/user-scope/index.js";

export type DbWriteKind = "insert" | "update" | "delete" | "replace";

export interface DbWriteEvent {
    scopeKey: string;
    table: string;
    kind: DbWriteKind;
}

export type DbWriteHandler = (event: DbWriteEvent) => void;

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function broadcastDbWrite(scopeKey: string, table: string, kind: DbWriteKind): void {
    emitter.emit("write", { scopeKey, table, kind });
}

export function subscribeDbWrites(handler: DbWriteHandler): () => void {
    emitter.on("write", handler);
    return () => emitter.off("write", handler);
}

export const SCOPE_DISCORD_BOT = "discord_bot";
export const SCOPE_DISCORD_GUILD = "discord_guild";

export function scopeKeyForBuiltin(dbName: string): string | null {
    if (dbName === "clansocket") return SCOPE_APP;
    if (dbName === SCOPE_VAREZ) return SCOPE_VAREZ;
    if (dbName === SCOPE_DISCORD_BOT) return SCOPE_DISCORD_BOT;
    return null;
}

export function scopeKeyForClan(clanId: string): string {
    return `${SCOPE_CLAN}:${clanId}`;
}

export function scopeKeyForClanAudit(clanId: string): string {
    return `${SCOPE_CLAN_AUDIT}:${clanId}`;
}

export function scopeKeyForPlugin(clanId: string, mode: string): string {
    return `${SCOPE_PLUGIN}:${clanId}:${mode}`;
}

export function scopeKeyForDiscordGuild(clanId: string, guildId: string): string {
    return `${SCOPE_DISCORD_GUILD}:${clanId}:${guildId}`;
}
