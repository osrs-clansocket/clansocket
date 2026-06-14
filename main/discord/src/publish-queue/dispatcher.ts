import logger from "@clansocket/logger";
import type { Client, PermissionResolvable } from "discord.js";
import { loadPendingPublishQueue, type PendingPublishRow } from "../loaders/publish-queue-loader.js";
import { validateBotPermission } from "../validators/bot-permission.js";
import { transitionApplied, transitionFailed, transitionInFlight } from "./transition.js";

export interface PublishResult {
    snowflakeResolved?: string | null;
}

export type PublishHandler = (client: Client, row: PendingPublishRow) => Promise<PublishResult>;

export interface PublisherRegistration {
    handler: PublishHandler;
    requiredBotPermission?: PermissionResolvable;
}

function handlerKey(opKind: string, targetKind: string): string {
    return `${opKind}:${targetKind}`;
}

const PUBLISHERS: Record<string, PublisherRegistration> = {};

export function registerPublisher(opKind: string, targetKind: string, registration: PublisherRegistration): void {
    PUBLISHERS[handlerKey(opKind, targetKind)] = registration;
}

async function failPermission(clanId: string, row: PendingPublishRow, permission: PermissionResolvable): Promise<void> {
    const payload = JSON.stringify({ error: "bot_permission_denied", permission: String(permission) });
    await transitionFailed(clanId, row.guild_id, row.queue_id, payload);
    logger.warn(`Bot lacks ${String(permission)} for ${row.target_kind} in guild ${row.guild_id}`);
}

async function invokeHandler(
    clanId: string,
    client: Client,
    row: PendingPublishRow,
    reg: PublisherRegistration,
): Promise<void> {
    try {
        const result = await reg.handler(client, row);
        await transitionApplied(clanId, row.guild_id, row.queue_id, result.snowflakeResolved ?? null);
    } catch (err: any) {
        await transitionFailed(clanId, row.guild_id, row.queue_id, JSON.stringify({ message: err.message }));
        logger.warn(`Publish dispatch failed for ${row.queue_id}: ${err.message}`);
    }
}

async function checkAndRun(
    clanId: string,
    client: Client,
    row: PendingPublishRow,
    reg: PublisherRegistration,
): Promise<void> {
    if (reg.requiredBotPermission) {
        const ok = await validateBotPermission({
            client,
            guildId: row.guild_id,
            requiredPermission: reg.requiredBotPermission,
        });
        if (!ok) {
            await failPermission(clanId, row, reg.requiredBotPermission);
            return;
        }
    }
    await invokeHandler(clanId, client, row, reg);
}

async function runPublisher(clanId: string, client: Client, row: PendingPublishRow): Promise<void> {
    const claimed = await transitionInFlight(clanId, row.guild_id, row.queue_id);
    if (claimed === false) return;
    const reg = PUBLISHERS[handlerKey(row.op_kind, row.target_kind)];
    if (!reg) {
        await transitionFailed(clanId, row.guild_id, row.queue_id, JSON.stringify({ error: "no_handler" }));
        logger.warn(`Publish handler missing for ${row.op_kind}:${row.target_kind}`);
        return;
    }
    await checkAndRun(clanId, client, row, reg);
}

export async function drainPublishQueue(clanId: string, guildId: string, client: Client): Promise<number> {
    const rows = await loadPendingPublishQueue(clanId, guildId);
    if (rows.length === 0) return 0;
    let count = 0;
    for (const row of rows) {
        await runPublisher(clanId, client, row);
        count++;
    }
    return count;
}
