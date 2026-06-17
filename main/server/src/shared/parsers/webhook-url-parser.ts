const URL_PREFIXES: readonly string[] = [
    "https://discord.com/api/webhooks/",
    "https://discord.com/api/v10/webhooks/",
    "https://discord.com/api/v9/webhooks/",
    "https://discordapp.com/api/webhooks/",
    "https://discordapp.com/api/v10/webhooks/",
    "https://discordapp.com/api/v9/webhooks/",
];

const PATH_SEP = "/";
const QUERY_SEP = "?";
const DIGIT_LOW = "0";
const DIGIT_HIGH = "9";
const WEBHOOK_PARTS_REQUIRED = 2;

export interface ParsedWebhookUrl {
    webhookId: string;
    webhookToken: string;
}

function isNumericString(s: string): boolean {
    if (s.length === 0) return false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c < DIGIT_LOW || c > DIGIT_HIGH) return false;
    }
    return true;
}

function stripQuery(suffix: string): string {
    const queryIdx = suffix.indexOf(QUERY_SEP);
    return queryIdx >= 0 ? suffix.slice(0, queryIdx) : suffix;
}

function matchPrefix(trimmed: string): string | null {
    for (const prefix of URL_PREFIXES) {
        if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
    }
    return null;
}

export function parseWebhookUrl(input: string): ParsedWebhookUrl | null {
    const trimmed = input.trim();
    const suffix = matchPrefix(trimmed);
    if (suffix === null) return null;
    const path = stripQuery(suffix);
    const parts = path.split(PATH_SEP).filter((p) => p.length > 0);
    if (parts.length < WEBHOOK_PARTS_REQUIRED) return null;
    const webhookId = parts[0];
    const webhookToken = parts[1];
    if (!isNumericString(webhookId)) return null;
    if (webhookToken.length === 0) return null;
    return { webhookId, webhookToken };
}
