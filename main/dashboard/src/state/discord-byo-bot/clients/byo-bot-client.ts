import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";
import { canMutateLinker, type LinkerGateResult } from "../../clan-vault-auth/util/can-mutate-linker.js";

export type VerifyStatus = "ok" | "auth-failed" | "unknown" | "expired";

export interface ByoBotPublicMetadata {
    username: string;
    application_id: string;
}

export interface ByoBotServedGuild {
    guild_id: string;
    guild_name: string;
}

export interface ByoBotLinkedStatus {
    linked: true;
    bot_id: string;
    username: string;
    application_id: string;
    last_verified_at: number | null;
    last_verified_status: VerifyStatus;
    owner_site_account_id: string;
    owner_display_name: string;
    clan_owner_site_account_id: string | null;
    served_guilds: ByoBotServedGuild[];
}

export interface ByoBotUnlinkedStatus {
    linked: false;
}

export type ByoBotStatus = ByoBotLinkedStatus | ByoBotUnlinkedStatus;

export interface ByoBotVerifyPayload {
    applicationId: string;
    botToken: string;
    publicKey?: string;
}

export interface VerifyResult {
    ok: boolean;
    publicMetadata?: ByoBotPublicMetadata;
    reason?: string;
}

export interface LinkResult {
    ok: boolean;
    linked?: {
        bot_id: string;
        username: string;
        application_id: string;
    };
    reason?: string;
}

export interface ReassignLinkerPayload {
    newLinkerUserId: string;
}

export interface ReassignLinkerResult {
    ok: boolean;
    newLinker?: { user_id: string; display_name: string };
    reason?: string;
}

interface ServerPayload {
    application_id: string;
    bot_token: string;
    public_key?: string;
    guild_id?: string;
}

const VERIFY_PATH = "/verify";
const REASSIGN_PATH = "/reassign-linker";
const STREAM_PATH = "/stream";

function baseUrl(slug: string): string {
    return `/api/discord/byo-bot/${encodeURIComponent(slug)}`;
}

function toServerPayload(p: ByoBotVerifyPayload, guildId?: string): ServerPayload {
    const out: ServerPayload = {
        application_id: p.applicationId,
        bot_token: p.botToken,
    };
    if (p.publicKey !== undefined) out.public_key = p.publicKey;
    if (guildId !== undefined) out.guild_id = guildId;
    return out;
}

export async function verifyByoBot(slug: string, payload: ByoBotVerifyPayload): Promise<VerifyResult> {
    const url = `${baseUrl(slug)}${VERIFY_PATH}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toServerPayload(payload)),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as VerifyResult;
}

export async function linkByoBot(slug: string, payload: ByoBotVerifyPayload, guildId?: string): Promise<LinkResult> {
    const url = baseUrl(slug);
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toServerPayload(payload, guildId)),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as LinkResult;
}

export async function bindByoBotToGuild(slug: string, guildId: string): Promise<boolean> {
    const url = `${baseUrl(slug)}/bind/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, { method: "POST" });
    return res.ok;
}

export async function unbindByoBotFromGuild(slug: string, guildId: string): Promise<boolean> {
    const url = `${baseUrl(slug)}/unbind/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, { method: "POST" });
    return res.ok;
}

export async function revokeByoBot(slug: string): Promise<boolean> {
    const res = await sameOriginFetch(baseUrl(slug), { method: "DELETE" });
    return res.ok;
}

export async function getByoBotStatus(slug: string): Promise<ByoBotStatus> {
    const res = await sameOriginFetch(baseUrl(slug), { method: "GET" });
    if (!res.ok) return { linked: false };
    return (await res.json()) as ByoBotStatus;
}

export function openByoBotStream(slug: string, onUpdate: () => void): () => void {
    const url = `${baseUrl(slug)}${STREAM_PATH}`;
    const source = new EventSource(url);
    source.addEventListener("message", onUpdate);
    return () => source.close();
}

export async function reassignByoBotLinker(
    slug: string,
    payload: ReassignLinkerPayload,
): Promise<ReassignLinkerResult> {
    const url = `${baseUrl(slug)}${REASSIGN_PATH}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_linker_user_id: payload.newLinkerUserId }),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as ReassignLinkerResult;
}

export async function verifyAndLinkByoBot(
    slug: string,
    payload: ByoBotVerifyPayload,
    guildId?: string,
): Promise<LinkResult> {
    const verify = await verifyByoBot(slug, payload);
    if (!verify.ok) return { ok: false, reason: verify.reason ?? "verify_failed" };
    return linkByoBot(slug, payload, guildId);
}

export function canMutateLinkerForByoBot(status: ByoBotStatus, currentUserId: string): LinkerGateResult {
    if (!status.linked) {
        return { canMutate: false, isOwnerOverride: false, canReassign: false };
    }
    return canMutateLinker(
        {
            linkerSiteAccountId: status.owner_site_account_id,
            clanOwnerSiteAccountId: status.clan_owner_site_account_id,
        },
        currentUserId,
    );
}
