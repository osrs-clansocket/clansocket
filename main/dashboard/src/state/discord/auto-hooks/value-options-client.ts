import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";
import { readJsonOrFallback } from "../../fetch-result.js";

export async function fetchConditionValueOptions(
    guildId: string,
    triggerType: string,
    field: string,
): Promise<readonly string[]> {
    const url =
        `/api/discord/auto-hook-conditions/value-options/${encodeURIComponent(guildId)}` +
        `?trigger=${encodeURIComponent(triggerType)}` +
        `&field=${encodeURIComponent(field)}`;
    const res = await sameOriginFetch(url);
    const body = await readJsonOrFallback<{ values?: readonly string[] }>(res, {});
    return body.values ?? [];
}
