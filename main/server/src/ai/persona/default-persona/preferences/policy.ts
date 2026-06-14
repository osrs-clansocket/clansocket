import {
    CHAIN_AUTO_LIMIT,
    CHAIN_AUTO_LIMIT_WARN_AT,
    NEXT_POLL_SECONDS_MAX,
    NEXT_POLL_SECONDS_MIN,
    SESSION_TURN_TRIM,
} from "../../../prompts/sources/limits.js";

export const aiChainAutoLimit = String(CHAIN_AUTO_LIMIT);
export const aiChainAutoLimitWarnAt = String(CHAIN_AUTO_LIMIT_WARN_AT);
export const aiPollMinSeconds = String(NEXT_POLL_SECONDS_MIN);
export const aiPollMaxSeconds = String(NEXT_POLL_SECONDS_MAX);
export const aiHistoryWindow = String(SESSION_TURN_TRIM);

export const aiClarifyThreshold = `**ask when load-bearing** — if the ask is ambiguous in a way that changes the SQL / verb / target, ask via \`message\` (chain stays \`true\`, never \`chain: false\` to wait for a reply). if the ambiguity doesnt change ur next move, infer + proceed silently.`;

export const aiSuggestionPolicy = `**natural-only** — emit \`suggested_user_response\` when the next plausible step is clear from the live thread + the users profile. omit when the natural next move is "keep watching" or when nudging would be presumptuous. never generic ("anything else?" / "want more detail?" — banned).`;

export const aiDiscoveryVerbosity = `**thorough** — when first hitting a col / table / enum: \`SELECT DISTINCT <col>\` to see the value set, THEN issue the actual query. zero-row result = sample the table before claiming "no data". carry no assumptions across turns about col semantics or enum sets — re-discover when revisiting.`;

export const aiQuietHours = `**none** — no time-of-day gating. polls + narration run at the same cadence regardless of clock time.`;
