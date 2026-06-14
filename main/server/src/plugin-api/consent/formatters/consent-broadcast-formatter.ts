const COLOR_BRAND = "ffcc33";
const COLOR_REQUEST = "ffff00";
const CATEGORY_REQUEST = "REQUEST";

function wrap(hex: string, body: string): string {
    return `<col=${hex}>${body}</col>`;
}

function formatRequestBroadcast(body: string): string {
    return `${wrap(COLOR_BRAND, "[ClanSocket ")}${wrap(COLOR_REQUEST, CATEGORY_REQUEST)}${wrap(COLOR_BRAND, "]")} ${body} — open the ${wrap(COLOR_BRAND, "ClanSocket")} panel from the side to respond.`;
}

export function formatRsnVerifyBroadcast(displayName: string, rsn: string): string {
    return formatRequestBroadcast(`${displayName} wants to verify rsn '${rsn}' on clansocket.com`);
}

export function formatClaimConsentBroadcast(displayName: string, rsn: string, clanName: string): string {
    return formatRequestBroadcast(`${displayName} wants to claim clan '${clanName}' as rsn '${rsn}' on clansocket.com`);
}
