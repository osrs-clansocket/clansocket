import { apiGet } from "../fetchers/api-fetcher.js";
import type { PresenceTemplate } from "../shared/types/presence-types.js";

export async function loadPresence(botId: string): Promise<PresenceTemplate | null> {
    const body = await apiGet<{ template: PresenceTemplate | null }>(`/api/discord/presence/${botId}`);
    return body?.template ?? null;
}
