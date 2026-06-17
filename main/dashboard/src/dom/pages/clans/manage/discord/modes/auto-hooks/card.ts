import {
    BTN_VARIANT_BARE,
    BTN_VARIANT_OUTLINE,
    BTN_VARIANT_PRIMARY,
    button,
    div,
    icon,
    span,
    wireChange,
    wireClick,
    type Instance,
} from "../../../../../../factory";
import { buildGlassSelect, type SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import { buildGlassCheck } from "../../../../../../forms/glass/inputs/glass-check.js";
import { openDisplayNameEdit } from "../../../../../../clans/account/workflows/display-name-edit.js";
import {
    ACCOUNT_GREETING_EDIT_CLASS,
    ACCOUNT_GREETING_NAME_CLASS,
    ACCOUNT_GREETING_NAME_ROW_CLASS,
} from "../../../../../../../shared/constants/account-constants.js";
import { BS_ICON_CLASS, BS_ICON_PENCIL_CLASS } from "../../../../../../../shared/constants/bootstrap-icon-constants.js";
import type { AutoHookRow } from "../../../../../../../state/discord/auto-hooks/client.js";
import {
    AUTO_HOOKS_ACTIONS_CLASS,
    AUTO_HOOKS_CARD_BODY_CLASS,
    AUTO_HOOKS_CARD_CLASS,
    AUTO_HOOKS_CARD_DELETE_CLASS,
    AUTO_HOOKS_CARD_HEADER_CLASS,
    AUTO_HOOKS_CARD_LABEL_CLASS,
    AUTO_HOOKS_EMBED_TOGGLE_CLASS,
    DELETE_BTN_LABEL,
    ENABLED_LABEL,
    NAME_LABEL,
    SAVE_BTN_LABEL,
    TEST_BTN_LABEL,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";
import { buildCardBody, type CardBodyState } from "./card-body.js";
import { parseConditions, serializeConditions } from "./condition-editor.js";
import type { EmbedState } from "./embed-editor.js";
import { setPreviewState } from "./preview/preview-state.js";
import { testSendAutoHook } from "../../../../../../../state/discord/auto-hooks/client.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";

export interface CardCallbacks {
    onSave: (next: AutoHookRow) => Promise<void>;
    onToggle: (autoHookId: string, enabled: boolean) => Promise<void>;
    onDelete: (autoHookId: string) => Promise<void>;
}

interface CardState extends CardBodyState {
    name: string;
    triggerType: string;
    webhookId: string;
}

interface RawEmbed {
    title?: string;
    description?: string;
    color?: number | string;
    url?: string;
    author?: { name?: string; icon_url?: string };
    footer?: { text?: string; icon_url?: string };
    thumbnail?: { url?: string };
    image?: { url?: string };
}

function parseEmbedTemplate(json: string | null): EmbedState {
    const fallback: EmbedState = {
        title: "",
        description: "",
        color: "#5865F2",
        url: "",
        authorName: "",
        authorIconUrl: "",
        footerText: "",
        footerIconUrl: "",
        thumbnailUrl: "",
        imageUrl: "",
    };
    if (json === null || json.length === 0) return fallback;
    try {
        const p = JSON.parse(json) as RawEmbed;
        const color =
            typeof p.color === "number" ? `#${p.color.toString(16).padStart(6, "0")}` : (p.color ?? "#5865F2");
        return {
            title: p.title ?? "",
            description: p.description ?? "",
            color,
            url: p.url ?? "",
            authorName: p.author?.name ?? "",
            authorIconUrl: p.author?.icon_url ?? "",
            footerText: p.footer?.text ?? "",
            footerIconUrl: p.footer?.icon_url ?? "",
            thumbnailUrl: p.thumbnail?.url ?? "",
            imageUrl: p.image?.url ?? "",
        };
    } catch {
        return fallback;
    }
}

function embedHasContent(o: RawEmbed): boolean {
    return (
        (typeof o.title === "string" && o.title.length > 0) ||
        (typeof o.description === "string" && o.description.length > 0) ||
        o.author !== undefined ||
        o.footer !== undefined ||
        o.thumbnail !== undefined ||
        o.image !== undefined ||
        (typeof o.url === "string" && o.url.length > 0)
    );
}

function serializeEmbedTemplate(s: EmbedState): string | null {
    const colorInt = parseInt(s.color.replace("#", ""), 16);
    const obj: RawEmbed = {};
    if (s.title.length > 0) obj.title = s.title;
    if (s.description.length > 0) obj.description = s.description;
    if (Number.isFinite(colorInt)) obj.color = colorInt;
    if (s.url.length > 0) obj.url = s.url;
    if (s.authorName.length > 0 || s.authorIconUrl.length > 0) {
        obj.author = { name: s.authorName.length > 0 ? s.authorName : " " };
        if (s.authorIconUrl.length > 0) obj.author.icon_url = s.authorIconUrl;
    }
    if (s.footerText.length > 0 || s.footerIconUrl.length > 0) {
        obj.footer = { text: s.footerText.length > 0 ? s.footerText : " " };
        if (s.footerIconUrl.length > 0) obj.footer.icon_url = s.footerIconUrl;
    }
    if (s.thumbnailUrl.length > 0) obj.thumbnail = { url: s.thumbnailUrl };
    if (s.imageUrl.length > 0) obj.image = { url: s.imageUrl };
    if (!embedHasContent(obj)) return null;
    return JSON.stringify(obj);
}

function publishPreview(state: CardState): void {
    setPreviewState({
        name: state.name,
        triggerType: state.triggerType,
        content: state.contentTemplate,
        useEmbed: state.useEmbed,
        embedTitle: state.embed.title,
        embedDescription: state.embed.description,
        embedColor: state.embed.color,
        embedUrl: state.embed.url,
        embedAuthorName: state.embed.authorName,
        embedAuthorIconUrl: state.embed.authorIconUrl,
        embedFooterText: state.embed.footerText,
        embedFooterIconUrl: state.embed.footerIconUrl,
        embedThumbnailUrl: state.embed.thumbnailUrl,
        embedImageUrl: state.embed.imageUrl,
    });
}

function buildHeader(state: CardState, row: AutoHookRow, cb: CardCallbacks): Instance {
    const nameEl = span({
        classes: [ACCOUNT_GREETING_NAME_CLASS],
        text: state.name,
        context: null,
        meta: null,
    });
    const editIcon = button(
        {
            compact: true,
            classes: [ACCOUNT_GREETING_EDIT_CLASS],
            ariaLabel: `Edit ${NAME_LABEL}`,
            title: `Edit ${NAME_LABEL}`,
            context: "edit the auto-hook display name",
            meta: ["action"],
            onClick: () =>
                openDisplayNameEdit({
                    nameEl: nameEl.el,
                    iconEl: editIcon.el,
                    ariaLabel: NAME_LABEL,
                    context: "edit the auto-hook display name",
                    onSave: (next) => {
                        state.name = next;
                        nameEl.el.textContent = next;
                        publishPreview(state);
                    },
                }),
        },
        [span({ classes: [BS_ICON_CLASS, BS_ICON_PENCIL_CLASS], context: null, meta: null })],
    );
    const nameRow = div({ classes: [ACCOUNT_GREETING_NAME_ROW_CLASS], context: null, meta: null }, [nameEl, editIcon]);
    const toggleEl = buildGlassCheck({
        name: `enabled-${row.auto_hook_id}`,
        checked: () => row.enabled === 1,
        ariaLabel: ENABLED_LABEL,
        onChange: (next) => {
            void cb.onToggle(row.auto_hook_id, next);
        },
    });
    const enableGroup = div({ classes: [AUTO_HOOKS_EMBED_TOGGLE_CLASS], context: null, meta: null }, [
        span({ classes: [AUTO_HOOKS_CARD_LABEL_CLASS], text: `${ENABLED_LABEL}:`, context: null, meta: null }),
        toggleEl,
    ]);
    const delBtn = button(
        {
            variant: BTN_VARIANT_BARE,
            classes: [AUTO_HOOKS_CARD_DELETE_CLASS],
            ariaLabel: DELETE_BTN_LABEL,
            context: "delete this auto-hook",
            meta: ["action", "destructive"],
            onClick: () => {
                void cb.onDelete(row.auto_hook_id);
            },
        },
        [icon({ name: "trash", context: null, meta: null }).el],
    );
    return div({ classes: [AUTO_HOOKS_CARD_HEADER_CLASS], context: null, meta: null }, [nameRow, enableGroup, delBtn]);
}

interface SelectsContext {
    row: AutoHookRow;
    state: CardState;
    triggers: SelectOption[];
    webhooks: SelectOption[];
    onTriggerChange: () => void;
}

function buildSelects(ctx: SelectsContext): { trigger: Instance; webhook: Instance } {
    const { row, state, triggers, webhooks, onTriggerChange } = ctx;
    const trigger = buildGlassSelect(`trigger-${row.auto_hook_id}`, triggers, state.triggerType);
    const tHidden = trigger.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (tHidden)
        wireChange(tHidden, () => {
            state.triggerType = tHidden.value;
            state.conditions = [];
            onTriggerChange();
            publishPreview(state);
        });
    const webhook = buildGlassSelect(`webhook-${row.auto_hook_id}`, webhooks, state.webhookId);
    const wHidden = webhook.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (wHidden)
        wireChange(wHidden, () => {
            state.webhookId = wHidden.value;
        });
    return { trigger, webhook };
}

function buildSaveBtn(state: CardState, row: AutoHookRow, cb: CardCallbacks): Instance {
    const saveBtn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        text: SAVE_BTN_LABEL,
        context: "save the auto-hook edits",
        meta: ["action", "submit"],
    });
    wireClick(saveBtn.el, () => {
        void cb.onSave({
            ...row,
            auto_hook_name: state.name,
            trigger_type: state.triggerType,
            webhook_id: state.webhookId,
            content_template: state.contentTemplate.length > 0 ? state.contentTemplate : null,
            use_embed: state.useEmbed ? 1 : 0,
            embed_template_json: state.useEmbed ? serializeEmbedTemplate(state.embed) : null,
            conditions_json: serializeConditions(state.conditions),
            webhook_username_override: state.webhookUsernameOverride,
            webhook_avatar_url_override: state.webhookAvatarUrlOverride,
        });
    });
    return saveBtn;
}

const TEST_SENDING_LABEL = "Sending…";
const TEST_SENT_LABEL = "Sent ✓";
const TEST_FAILED_LABEL = "Failed";
const TEST_FEEDBACK_RESET_MS = 2500;

function buildTestBtn(state: CardState, row: AutoHookRow): Instance {
    const testBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: TEST_BTN_LABEL,
        context: "send a sample message to the configured webhook for preview testing",
        meta: ["action"],
    });
    let resetHandle: number | null = null;
    function flashResult(label: string): void {
        if (resetHandle !== null) window.clearTimeout(resetHandle);
        testBtn.setText(label);
        resetHandle = window.setTimeout(() => {
            testBtn.setText(TEST_BTN_LABEL);
            testBtn.el.disabled = false;
            resetHandle = null;
        }, TEST_FEEDBACK_RESET_MS);
    }
    wireClick(testBtn.el, () => {
        const session = identityStore.session$();
        if (session === null) return;
        testBtn.setText(TEST_SENDING_LABEL);
        testBtn.el.disabled = true;
        void testSendAutoHook(row.guild_id, {
            userId: session.id,
            autoHookId: row.auto_hook_id,
            autoHookName: state.name,
            triggerType: state.triggerType,
            webhookId: state.webhookId,
            contentTemplate: state.contentTemplate.length > 0 ? state.contentTemplate : null,
            useEmbed: state.useEmbed,
            embedTemplateJson: state.useEmbed ? serializeEmbedTemplate(state.embed) : null,
            conditionsJson: serializeConditions(state.conditions),
            webhookUsernameOverride: state.webhookUsernameOverride,
            webhookAvatarUrlOverride: state.webhookAvatarUrlOverride,
        })
            .then((ok) => {
                flashResult(ok ? TEST_SENT_LABEL : TEST_FAILED_LABEL);
            })
            .catch(() => {
                flashResult(TEST_FAILED_LABEL);
            });
    });
    return testBtn;
}

export interface CardOptions {
    row: AutoHookRow;
    triggerOptions: SelectOption[];
    webhookOptions: SelectOption[];
    cb: CardCallbacks;
    getValueOptions: (triggerType: string, field: string) => readonly string[];
    subscribeValueOptions: (listener: () => void) => () => void;
}

export function buildAutoHookCard(opts: CardOptions): Instance {
    const { row, triggerOptions, webhookOptions, cb, getValueOptions, subscribeValueOptions } = opts;
    const state: CardState = {
        name: row.auto_hook_name,
        triggerType: row.trigger_type,
        webhookId: row.webhook_id,
        contentTemplate: row.content_template ?? "",
        useEmbed: row.use_embed === 1,
        embed: parseEmbedTemplate(row.embed_template_json),
        conditions: parseConditions(row.conditions_json),
        webhookUsernameOverride: row.webhook_username_override,
        webhookAvatarUrlOverride: row.webhook_avatar_url_override,
    };
    const triggerChangeListeners = new Set<() => void>();
    function subscribeTriggerChange(listener: () => void): () => void {
        triggerChangeListeners.add(listener);
        return () => {
            triggerChangeListeners.delete(listener);
        };
    }
    function notifyTriggerChange(): void {
        for (const l of triggerChangeListeners) l();
    }
    const selects = buildSelects({
        row,
        state,
        triggers: triggerOptions,
        webhooks: webhookOptions,
        onTriggerChange: notifyTriggerChange,
    });
    const bodyResult = buildCardBody(
        row.guild_id,
        state,
        {
            onContentChange: (v) => {
                state.contentTemplate = v;
                publishPreview(state);
            },
            onUseEmbedChange: (v) => {
                state.useEmbed = v;
                publishPreview(state);
            },
            onEmbedChange: (next) => {
                state.embed = next;
                publishPreview(state);
            },
            onConditionsChange: (next) => {
                state.conditions = next;
            },
            onWebhookUsernameOverrideChange: (next) => {
                state.webhookUsernameOverride = next;
            },
            onWebhookAvatarUrlOverrideChange: (next) => {
                state.webhookAvatarUrlOverride = next;
            },
            getTriggerType: () => state.triggerType,
            getValueOptions,
            subscribeValueOptions,
            subscribeTriggerChange,
        },
        { selects: [selects.trigger, selects.webhook] },
    );
    bodyResult.formatTextarea.el.addEventListener("focus", () => publishPreview(state));
    const saveBtn = buildSaveBtn(state, row, cb);
    const testBtn = buildTestBtn(state, row);
    const actions = div({ classes: [AUTO_HOOKS_ACTIONS_CLASS], context: null, meta: null }, [testBtn, saveBtn]);
    const body = div({ classes: [AUTO_HOOKS_CARD_BODY_CLASS], context: null, meta: null }, [bodyResult.root, actions]);
    return div({ classes: [AUTO_HOOKS_CARD_CLASS], context: null, meta: null }, [buildHeader(state, row, cb), body]);
}
