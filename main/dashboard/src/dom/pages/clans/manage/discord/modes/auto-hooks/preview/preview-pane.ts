import { div, effect, paragraph, signal, type Instance } from "../../../../../../../factory";
import { AUTO_HOOKS_PREVIEW_ROOT_CLASS } from "../../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";
import { ensureDiscordEmojisLoaded } from "../../../../../../../../state/icons/discord-emojis-store.js";
import { previewState$ } from "./preview-state.js";
import { renderContentPreview } from "./render-content-preview.js";
import { renderEmbedPreview } from "./render-embed-preview.js";

const EMPTY_HINT = "Focus a card's format editor to see a live preview here.";

export function buildPreviewPane(): Instance {
    const root = div({ classes: [AUTO_HOOKS_PREVIEW_ROOT_CLASS], context: null, meta: null });
    const emojisLoaded$ = signal<boolean>(false);
    void ensureDiscordEmojisLoaded().then(() => emojisLoaded$.set(true));
    effect(() => {
        emojisLoaded$();
        const state = previewState$();
        if (state === null) {
            root.setChildren(paragraph({ text: EMPTY_HINT, context: null, meta: null, classes: [] }));
            return;
        }
        const children: Instance[] = [renderContentPreview(state)];
        if (state.useEmbed) children.push(renderEmbedPreview(state));
        root.setChildren(...children);
    });
    return root;
}
