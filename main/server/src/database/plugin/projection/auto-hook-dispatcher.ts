import logger from "@clansocket/logger";
import { renderAutoHook } from "../../../discord/body-renderers/render-auto-hook.js";
import { getAutoHooksByTrigger } from "../../discord/auto-hooks/get-by-trigger.js";
import type { AutoHookRow } from "../../discord/auto-hooks/list.js";
import { enqueueOutboundEvent } from "../../discord/outbound/enqueue.js";
import { listByClan } from "../../discord/servers/list-by-clan.js";
import { getDecryptedWebhookToken } from "../../discord/webhook-tokens/get-decrypted.js";
import { lookupAccountType } from "../helpers/lookup-account-type.js";
import { lookupClanMemberCount } from "../helpers/lookup-clan-member-count.js";
import { evaluateConditions } from "./condition-evaluator.js";

const TARGET_KIND_WEBHOOK_POST = "webhook_post";

export interface DispatchInput {
    clanId: string;
    triggerType: string;
    rsn: string | null;
    payload: object;
}

interface GuildContext {
    guildId: string;
    botId: string;
    botName: string;
    clanId: string;
    rsn: string;
}

function enqueueForRow(row: AutoHookRow, ctx: GuildContext, payload: object): void {
    if (!evaluateConditions(row.conditions_json, payload)) return;
    const token = getDecryptedWebhookToken(ctx.clanId, ctx.guildId, row.webhook_id);
    if (token === null) return;
    const envelope = renderAutoHook(row, payload, { rsn: ctx.rsn, clanName: null, botId: ctx.botId });
    if (envelope === null) return;
    enqueueOutboundEvent({
        botId: ctx.botId,
        botName: ctx.botName,
        guildId: ctx.guildId,
        clanId: ctx.clanId,
        targetKind: TARGET_KIND_WEBHOOK_POST,
        targetId: row.webhook_id,
        targetName: row.auto_hook_name,
        payload: { envelope, webhookId: row.webhook_id, token },
    });
}

function enrichUniversalContext(payload: object, clanId: string, rsn: string): object {
    const p = payload as Record<string, unknown>;
    const enriched: Record<string, unknown> = { ...p };
    if (typeof p.accountType !== "string" || p.accountType.length === 0) {
        enriched.accountType = lookupAccountType(clanId, rsn);
    }
    if (typeof p.clanMemberCount !== "number") {
        enriched.clanMemberCount = lookupClanMemberCount(clanId);
    }
    if (typeof p.eventReceivedAt !== "number") {
        enriched.eventReceivedAt = Date.now();
    }
    return enriched;
}

function dispatchForGuild(input: DispatchInput, guildId: string, botId: string, botName: string): void {
    const rows = getAutoHooksByTrigger(input.clanId, guildId, input.triggerType);
    const ctx: GuildContext = {
        guildId,
        botId,
        botName,
        clanId: input.clanId,
        rsn: input.rsn ?? "",
    };
    const enrichedPayload = enrichUniversalContext(input.payload, input.clanId, input.rsn ?? "");
    for (const row of rows) {
        try {
            enqueueForRow(row, ctx, enrichedPayload);
        } catch (err) {
            logger.warn(`auto-hook dispatch failed for ${row.auto_hook_id}: ${(err as Error).message}`);
        }
    }
}

export function dispatchAutoHooks(input: DispatchInput): void {
    const guilds = listByClan(input.clanId);
    for (const g of guilds) {
        dispatchForGuild(input, g.guild_id, g.bot_id, g.bot_name);
    }
}

export function dispatchAutoHooksSafe(input: DispatchInput): void {
    try {
        dispatchAutoHooks(input);
    } catch (err) {
        logger.warn(`auto-hook dispatch top-level failure: ${(err as Error).message}`);
    }
}
