import type { DiscordChannel, DiscordChannelState } from "../../client.js";

export function channelStateOf(c: DiscordChannel): DiscordChannelState {
    return { name: c.name ?? "", topic: c.topic, nsfw: c.nsfw };
}
