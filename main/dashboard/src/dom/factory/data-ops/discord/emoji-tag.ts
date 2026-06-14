import type { ContextProps, Instance } from "../../core";
import { image } from "../../content-ops/graphics/media.js";
import { discordEmojiUrl, ensureDiscordEmojisLoaded } from "../../../../state/icons/discord-emojis-store.js";

const EMOJI_CLASS = "discord-emoji";
const FALLBACK_PATH = "/favicon.ico";

interface DiscordEmojiProps extends ContextProps {
    name: string;
    classes?: readonly string[];
}

function discordEmoji(props: DiscordEmojiProps): Instance<HTMLImageElement> {
    ensureDiscordEmojisLoaded().catch(() => undefined);
    const path = discordEmojiUrl(props.name) ?? FALLBACK_PATH;
    const classes = [EMOJI_CLASS, ...(props.classes ?? [])];
    return image({
        src: path,
        alt: `:${props.name}:`,
        title: `:${props.name}:`,
        classes,
    });
}

export { discordEmoji };
export type { DiscordEmojiProps };
