import logger from "@clansocket/logger";
import type { Client } from "discord.js";
import { loadPendingOutbound, type PendingOutboundRow } from "../loaders/outbound-loader.js";
import { extractWebhookRow } from "../state-sync/webhooks/extract.js";
import { extractWebhookTokenIfAvailable, type WebhookTokenSync } from "../state-sync/webhooks/extract-token.js";
import { postWebhooksChannelReplace } from "../state-sync/webhooks/post-channel-replace.js";
import { isWebhookCapable } from "../state-sync/webhooks/webhook-capable-guard.js";
import { parseAndSanitize } from "./components-v2-sanitizer.js";
import { transitionApplied, transitionFailed, transitionInFlight } from "./transition.js";

const KIND_CHANNEL_MESSAGE = "channel_message";
const KIND_DM = "dm";
const KIND_LEAVE_GUILD = "leave_guild";
const KIND_WEBHOOK_POST = "webhook_post";
const KIND_WEBHOOK_HEAL = "webhook_heal";
const WEBHOOK_URL_BASE = "https://discord.com/api/webhooks";
const HTTP_INTERNAL = 500;
const NULL_SENTINEL: null = null;

type Sender = (client: Client, event: PendingOutboundRow) => Promise<string | null>;

function requireSenderTargetId(event: PendingOutboundRow, kind: string): string {
    if (!event.target_id) throw new Error(`missing ${kind} target_id`);
    return event.target_id;
}

async function senderChannelMessage(client: Client, event: PendingOutboundRow): Promise<string | null> {
    const targetId = requireSenderTargetId(event, KIND_CHANNEL_MESSAGE);
    const channel = await client.channels.fetch(targetId);
    if (!channel || !channel.isTextBased()) throw new Error("invalid channel target");
    const payload = parseAndSanitize(event.payload_json);
    const msg = await (channel as any).send(payload);
    return msg?.id ?? NULL_SENTINEL;
}

async function senderDirectMessage(client: Client, event: PendingOutboundRow): Promise<string | null> {
    const targetId = requireSenderTargetId(event, KIND_DM);
    const user = await client.users.fetch(targetId);
    const dm = await user.createDM();
    const payload = parseAndSanitize(event.payload_json);
    const msg = await dm.send(payload);
    return msg?.id ?? NULL_SENTINEL;
}

async function senderLeaveGuild(client: Client, event: PendingOutboundRow): Promise<string | null> {
    const guild = await client.guilds.fetch(event.guild_id);
    if (!guild) return NULL_SENTINEL;
    await guild.leave();
    return NULL_SENTINEL;
}

interface WebhookPostPayload {
    envelope: object;
    webhookId: string;
    token: string;
}

async function senderWebhookPost(_client: Client, event: PendingOutboundRow): Promise<string | null> {
    const payload = JSON.parse(event.payload_json) as WebhookPostPayload;
    const url = `${WEBHOOK_URL_BASE}/${encodeURIComponent(payload.webhookId)}/${encodeURIComponent(payload.token)}?wait=true`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.envelope),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`webhook POST ${res.status}: ${text}`);
    }
    const body = (await res.json()) as { id?: string };
    return body.id ?? NULL_SENTINEL;
}

interface WebhookHealPayload {
    oldWebhookId: string;
    channelId: string;
    name: string;
    avatarUrl: string | null;
}

async function senderWebhookHeal(client: Client, event: PendingOutboundRow): Promise<string | null> {
    const payload = JSON.parse(event.payload_json) as WebhookHealPayload;
    const channelRaw = await client.channels.fetch(payload.channelId);
    if (!channelRaw) throw new Error("invalid channel for heal: not found");
    const channel = channelRaw as any;
    if (!isWebhookCapable(channel)) throw new Error("invalid channel for heal: not webhook-capable");
    const createOpts: { name: string; avatar?: string } = { name: payload.name };
    if (payload.avatarUrl) createOpts.avatar = payload.avatarUrl;
    const newWebhook = await channel.createWebhook(createOpts);
    try {
        const oldWh = await client.fetchWebhook(payload.oldWebhookId);
        await oldWh.delete("Replaced with bot-owned webhook for app emoji support");
    } catch (err: any) {
        logger.warn(`webhook heal: old ${payload.oldWebhookId} delete failed: ${err.message}`);
    }
    const guildId = event.guild_id;
    const channelName = "name" in channel && typeof channel.name === "string" ? channel.name : null;
    const collection = await channel.fetchWebhooks();
    const list = [...collection.values()];
    const rows = list.map(extractWebhookRow);
    const tokens: WebhookTokenSync[] = [];
    const botId = client.user?.id ?? "";
    for (const wh of list) {
        const tk = extractWebhookTokenIfAvailable(wh, channelName, botId);
        if (tk !== null) tokens.push(tk);
    }
    await postWebhooksChannelReplace(guildId, payload.channelId, rows, tokens, {
        oldWebhookId: payload.oldWebhookId,
        newWebhookId: newWebhook.id,
    });
    return newWebhook.id;
}

const SENDERS: Record<string, Sender> = {
    [KIND_CHANNEL_MESSAGE]: senderChannelMessage,
    [KIND_DM]: senderDirectMessage,
    [KIND_LEAVE_GUILD]: senderLeaveGuild,
    [KIND_WEBHOOK_POST]: senderWebhookPost,
    [KIND_WEBHOOK_HEAL]: senderWebhookHeal,
};

async function runSender(client: Client, event: PendingOutboundRow): Promise<void> {
    const claimed = await transitionInFlight(event.queue_id);
    if (claimed === false) return;
    const sender = SENDERS[event.target_kind] ?? NULL_SENTINEL;
    if (sender === NULL_SENTINEL) {
        await transitionFailed(event.queue_id, HTTP_INTERNAL, event.attempts + 1, NULL_SENTINEL);
        logger.warn(`Outbound dispatch unsupported target_kind: ${event.target_kind}`);
        return;
    }
    try {
        const responseId = await sender(client, event);
        await transitionApplied(event.queue_id, responseId);
    } catch (err: any) {
        const errCode = typeof err.code === "number" ? err.code : HTTP_INTERNAL;
        await transitionFailed(event.queue_id, errCode, event.attempts + 1, NULL_SENTINEL);
        logger.warn(`Outbound dispatch failed for ${event.queue_id}: ${err.message}`);
    }
}

export async function drainPending(botId: string, client: Client): Promise<number> {
    const events = await loadPendingOutbound(botId);
    if (events.length === 0) return 0;
    let count = 0;
    for (const event of events) {
        await runSender(client, event);
        count++;
    }
    return count;
}
