const IS_COMPONENTS_V2 = 1 << 15;
const V2_INCOMPATIBLE_FIELDS: ReadonlyArray<string> = ["content", "embeds", "poll", "stickers"];

interface PayloadShape {
    flags?: number;
    [key: string]: unknown;
}

function hasV2Flag(payload: PayloadShape): boolean {
    return typeof payload.flags === "number" && (payload.flags & IS_COMPONENTS_V2) !== 0;
}

export function sanitizeV2Payload(payload: PayloadShape): PayloadShape {
    if (!hasV2Flag(payload)) return payload;
    const cleaned: PayloadShape = { ...payload };
    for (const field of V2_INCOMPATIBLE_FIELDS) {
        delete cleaned[field];
    }
    return cleaned;
}

export function parseAndSanitize(jsonStr: string): PayloadShape {
    const raw = JSON.parse(jsonStr) as PayloadShape;
    return sanitizeV2Payload(raw);
}
