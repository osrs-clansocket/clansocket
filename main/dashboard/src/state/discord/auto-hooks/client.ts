import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";

export interface AutoHookRow {
    auto_hook_id: string;
    auto_hook_name: string;
    guild_id: string;
    trigger_type: string;
    webhook_id: string;
    content_template: string | null;
    use_embed: number;
    embed_template_json: string | null;
    conditions_json: string | null;
    enabled: number;
    webhook_username_override: string | null;
    webhook_avatar_url_override: string | null;
    created_by_account_id: string;
    created_by_account_name: string | null;
    created_at: number;
    updated_at: number;
}

export interface CreateAutoHookPayload {
    userId: string;
    userName: string | null;
    autoHookName: string;
    triggerType: string;
    webhookId: string;
    contentTemplate: string | null;
    useEmbed: boolean;
    embedTemplateJson: string | null;
    conditionsJson: string | null;
    enabled: boolean;
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
}

export interface UpdateAutoHookPayload extends CreateAutoHookPayload {}

export interface ToggleAutoHookPayload {
    userId: string;
    enabled: boolean;
    autoHookName: string;
}

export interface DeleteAutoHookPayload {
    userId: string;
    autoHookName: string;
}

export function openAutoHooksStream(guildId: string, onChange: () => void): () => void {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}/stream`;
    const src = new EventSource(url);
    src.addEventListener("change", () => onChange());
    return () => src.close();
}

export interface TestSendAutoHookPayload {
    userId: string;
    autoHookId: string | null;
    autoHookName: string;
    triggerType: string;
    webhookId: string;
    contentTemplate: string | null;
    useEmbed: boolean;
    embedTemplateJson: string | null;
    conditionsJson: string | null;
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
}

export async function testSendAutoHook(guildId: string, payload: TestSendAutoHookPayload): Promise<boolean> {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}/test-send`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export async function listAutoHooks(guildId: string): Promise<AutoHookRow[]> {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, { method: "GET" });
    if (!res.ok) return [];
    const body = (await res.json()) as { autoHooks: AutoHookRow[] };
    return body.autoHooks;
}

export async function createAutoHook(guildId: string, payload: CreateAutoHookPayload): Promise<string | null> {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { autoHookId: string };
    return body.autoHookId;
}

export async function updateAutoHook(
    guildId: string,
    autoHookId: string,
    payload: UpdateAutoHookPayload,
): Promise<boolean> {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}/${encodeURIComponent(autoHookId)}`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export async function toggleAutoHook(
    guildId: string,
    autoHookId: string,
    payload: ToggleAutoHookPayload,
): Promise<boolean> {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}/${encodeURIComponent(autoHookId)}/toggle`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export async function deleteAutoHook(
    guildId: string,
    autoHookId: string,
    payload: DeleteAutoHookPayload,
): Promise<boolean> {
    const url = `/api/discord/auto-hooks/${encodeURIComponent(guildId)}/${encodeURIComponent(autoHookId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}
