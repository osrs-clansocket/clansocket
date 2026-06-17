const DEFAULT_UA_PREFIX = "ClanSocket-clan-";

export function buildDefaultWomUserAgent(clanId: string): string {
    return DEFAULT_UA_PREFIX + clanId;
}
