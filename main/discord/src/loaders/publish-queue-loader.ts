import { apiGet } from "../fetchers/api-fetcher.js";

export interface PendingPublishRow {
    queue_id: string;
    guild_id: string;
    session_id: string;
    op_id: string;
    status: string;
    attempt_no: number;
    snowflake_resolved: string | null;
    resolved_dependencies_json: string | null;
    last_attempt_at: number | null;
    error_json: string | null;
    created_at: number;
    updated_at: number;
    op_kind: string;
    target_kind: string;
    target_id_or_temp: string;
    before_json: string | null;
    after_json: string | null;
}

export async function loadPendingPublishQueue(clanId: string, guildId: string): Promise<PendingPublishRow[]> {
    const body = await apiGet<{ events: PendingPublishRow[] }>(`/api/discord/publish-queue/${clanId}/${guildId}`);
    return body?.events ?? [];
}
