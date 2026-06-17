const ENVELOPE_FLAGS_SUPPRESS_EMBEDS = 4;
const NO_MENTIONS = { parse: [] as readonly string[] };

export interface WebhookEnvelopeInput {
    username: string;
    content: string | null;
    embeds: readonly object[] | null;
    avatarUrl: string | null;
}

export interface WebhookEnvelope {
    username: string;
    content: string;
    avatar_url?: string;
    embeds?: readonly object[];
    allowed_mentions: { parse: readonly string[] };
    flags?: number;
}

export function buildWebhookEnvelope(input: WebhookEnvelopeInput): WebhookEnvelope {
    const envelope: WebhookEnvelope = {
        username: input.username,
        content: input.content ?? "",
        allowed_mentions: NO_MENTIONS,
    };
    if (input.avatarUrl !== null && input.avatarUrl.length > 0) envelope.avatar_url = input.avatarUrl;
    const hasExplicitEmbeds = input.embeds !== null && input.embeds.length > 0;
    if (hasExplicitEmbeds) {
        envelope.embeds = input.embeds as readonly object[];
    } else {
        envelope.flags = ENVELOPE_FLAGS_SUPPRESS_EMBEDS;
    }
    return envelope;
}
