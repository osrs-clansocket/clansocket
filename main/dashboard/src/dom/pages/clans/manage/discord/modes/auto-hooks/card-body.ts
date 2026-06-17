import { BTN_VARIANT_CHIP, button, div, span, wireInput, type Instance } from "../../../../../../factory";
import { buildGlassCheck } from "../../../../../../forms/glass/inputs/glass-check.js";
import { glassTextarea } from "../../../../../../forms/glass/inputs/glass-textarea.js";
import { buildConditionEditor, type ConditionRow } from "./condition-editor.js";
import { buildEmbedEditor, type EmbedState } from "./embed-editor.js";
import { buildEmojiPicker } from "./emoji-picker.js";
import { buildOverridesEditor } from "./overrides-editor.js";
import { getTokensForTrigger } from "../../../../../../../shared/constants/clan-manage-discord/token-list.js";
import {
    AUTO_HOOKS_CARD_BODY_STACK_CLASS,
    AUTO_HOOKS_CARD_LABEL_CLASS,
    AUTO_HOOKS_EMBED_TOGGLE_CLASS,
    AUTO_HOOKS_TOKEN_CHIPS_CLASS,
    EMBED_LABEL,
    FORMAT_LABEL,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";

export interface CardBodyState {
    contentTemplate: string;
    useEmbed: boolean;
    embed: EmbedState;
    conditions: readonly ConditionRow[];
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
}

export interface CardBodyCallbacks {
    onContentChange: (value: string) => void;
    onUseEmbedChange: (useEmbed: boolean) => void;
    onEmbedChange: (next: EmbedState) => void;
    onConditionsChange: (next: readonly ConditionRow[]) => void;
    onWebhookUsernameOverrideChange: (next: string | null) => void;
    onWebhookAvatarUrlOverrideChange: (next: string | null) => void;
    getTriggerType: () => string;
    getValueOptions: (triggerType: string, field: string) => readonly string[];
    subscribeValueOptions: (listener: () => void) => () => void;
    subscribeTriggerChange: (listener: () => void) => () => void;
}

function insertAtCursor(ta: HTMLTextAreaElement, text: string): void {
    const pos = ta.selectionStart ?? ta.value.length;
    ta.value = ta.value.slice(0, pos) + text + ta.value.slice(pos);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
}

function buildTokenChips(getTrigger: () => string, ta: HTMLTextAreaElement): Instance {
    const tokens = getTokensForTrigger(getTrigger());
    const chips = tokens.map((t) => {
        const inst = button({
            variant: BTN_VARIANT_CHIP,
            text: t.label,
            context: `insert ${t.token} (sample: ${t.sampleValue})`,
            meta: ["action", "input"],
            onClick: () => insertAtCursor(ta, t.token),
        });
        inst.setAttr("title", `${t.token} → e.g. ${t.sampleValue}`);
        return inst;
    });
    return div({ classes: [AUTO_HOOKS_TOKEN_CHIPS_CLASS], context: null, meta: null }, chips);
}

export function buildCardBody(
    guildId: string,
    initial: CardBodyState,
    cb: CardBodyCallbacks,
    extras: { selects: readonly Instance[] },
): { root: Instance; formatTextarea: Instance<HTMLTextAreaElement> } {
    const formatTextarea = glassTextarea({
        value: initial.contentTemplate,
        ariaLabel: FORMAT_LABEL,
        context: "edit the message content template",
        meta: ["input"],
    });
    wireInput(formatTextarea.el, () => cb.onContentChange(formatTextarea.el.value));
    const chips = buildTokenChips(cb.getTriggerType, formatTextarea.el);
    const emojiPicker = buildEmojiPicker({
        guildId,
        getTriggerType: cb.getTriggerType,
        onInsert: (text) => insertAtCursor(formatTextarea.el, text),
    });
    const contentSection = div({ classes: [], context: null, meta: null }, [formatTextarea, chips, emojiPicker]);

    let useEmbedNow = initial.useEmbed;
    const embedHost = div({ classes: [], context: null, meta: null });
    const embedState: EmbedState = { ...initial.embed };

    function syncMode(): void {
        if (useEmbedNow) {
            contentSection.el.style.display = "none";
            embedHost.setChildren(
                buildEmbedEditor(
                    embedState,
                    {
                        onChange: (next) => {
                            Object.assign(embedState, next);
                            cb.onEmbedChange({ ...embedState });
                        },
                    },
                    {
                        buildDescAccessories: (textareaEl) => [
                            buildTokenChips(cb.getTriggerType, textareaEl),
                            buildEmojiPicker({
                                guildId,
                                getTriggerType: cb.getTriggerType,
                                onInsert: (text) => insertAtCursor(textareaEl, text),
                            }),
                        ],
                    },
                ),
            );
        } else {
            contentSection.el.style.display = "";
            embedHost.clear();
        }
    }

    const embedToggle = buildGlassCheck({
        name: "embed-toggle",
        checked: () => useEmbedNow,
        ariaLabel: EMBED_LABEL,
        onChange: (next) => {
            useEmbedNow = next;
            if (next && embedState.description.length === 0 && formatTextarea.el.value.length > 0) {
                embedState.description = formatTextarea.el.value;
                cb.onEmbedChange({ ...embedState });
                formatTextarea.el.value = "";
                cb.onContentChange("");
            }
            cb.onUseEmbedChange(next);
            syncMode();
        },
    });
    syncMode();

    const embedToggleRow = div({ classes: [AUTO_HOOKS_EMBED_TOGGLE_CLASS], context: null, meta: null }, [
        embedToggle,
        span({ classes: [AUTO_HOOKS_CARD_LABEL_CLASS], text: EMBED_LABEL, context: null, meta: null }),
    ]);

    const conditionEditor = buildConditionEditor(initial.conditions, {
        onChange: (next) => cb.onConditionsChange(next),
        getTriggerType: cb.getTriggerType,
        getValueOptions: cb.getValueOptions,
        subscribeValueOptions: cb.subscribeValueOptions,
        subscribeTriggerChange: cb.subscribeTriggerChange,
    });

    const overridesEditor = buildOverridesEditor(
        {
            webhookUsernameOverride: initial.webhookUsernameOverride,
            webhookAvatarUrlOverride: initial.webhookAvatarUrlOverride,
        },
        {
            onUsernameChange: cb.onWebhookUsernameOverrideChange,
            onAvatarUrlChange: cb.onWebhookAvatarUrlOverrideChange,
        },
    );

    const root = div({ classes: [AUTO_HOOKS_CARD_BODY_STACK_CLASS], context: null, meta: null }, [
        ...extras.selects,
        overridesEditor,
        contentSection,
        conditionEditor,
        embedToggleRow,
        embedHost,
    ]);
    return { root, formatTextarea };
}
