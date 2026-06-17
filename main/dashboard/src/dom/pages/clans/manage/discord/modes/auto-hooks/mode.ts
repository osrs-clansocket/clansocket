import "../../../../../../../styles/pages/clans/manage/discord/auto-hooks-page.css";
import "../../../../../../../styles/pages/account/greeting-page.css";
import { div, paragraph, type Instance } from "../../../../../../factory";
import {
    deleteAutoHook,
    listAutoHooks,
    openAutoHooksStream,
    toggleAutoHook,
    updateAutoHook,
    type AutoHookRow,
} from "../../../../../../../state/discord/auto-hooks/client.js";
import { listWebhookTokens, type WebhookTokenRow } from "../../../../../../../state/discord/webhook-tokens/client.js";
import { type DiscordChannel, type DiscordWebhook } from "../../../../../../../state/discord/client.js";
import { createChannelsFeed } from "../../../../../../../state/discord/channels/channels-feed.js";
import { createWebhooksFeed } from "../../../../../../../state/discord/webhooks/webhooks-feed.js";
import { inspectorOverride$ } from "../../../../../../../state/discord/inspector-override.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import { fetchConditionValueOptions } from "../../../../../../../state/discord/auto-hooks/value-options-client.js";
import { buildPreviewPane } from "./preview/preview-pane.js";
import { clearPreviewState } from "./preview/preview-state.js";
import {
    AUTO_HOOKS_ROOT_CLASS,
    NO_WEBHOOKS_TEXT,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";
import { DISCORD_PANE_PLACEHOLDER_CLASS } from "../../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import { buildAutoHooksList } from "./list.js";
import { buildAutoHookCreateFlow } from "./create-flow.js";
import { buildTriggerOptions } from "./trigger-options.js";
import { buildWebhookOptions } from "./webhook-options.js";

const LOADING_TEXT = "Loading auto-hooks…";
const EMPTY_VALUES: readonly string[] = [];

interface ModeState {
    autoHooks: AutoHookRow[];
    webhooks: DiscordWebhook[];
    tokens: WebhookTokenRow[];
    channels: DiscordChannel[];
    valueOptions: Map<string, readonly string[]>;
    pendingFetches: Set<string>;
    valueOptionsListeners: Set<() => void>;
}

async function loadConfigured(guildId: string): Promise<{ autoHooks: AutoHookRow[]; tokens: WebhookTokenRow[] }> {
    const [autoHooks, tokens] = await Promise.all([listAutoHooks(guildId), listWebhookTokens(guildId)]);
    return { autoHooks, tokens };
}

function buildChannelNameMap(channels: readonly DiscordChannel[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const c of channels) {
        if (c.name !== null) map.set(c.channel_id, c.name);
    }
    return map;
}

function buildCallbacks(
    guildId: string,
    state: ModeState,
    refetch: () => Promise<void>,
): {
    onSave: (next: AutoHookRow) => Promise<void>;
    onToggle: (id: string, enabled: boolean) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
} {
    function nameFor(id: string): string {
        return state.autoHooks.find((r) => r.auto_hook_id === id)?.auto_hook_name ?? id;
    }
    return {
        onSave: async (next) => {
            const session = identityStore.session$();
            if (session === null) return;
            await updateAutoHook(guildId, next.auto_hook_id, {
                userId: session.id,
                userName: session.displayName,
                autoHookName: next.auto_hook_name,
                triggerType: next.trigger_type,
                webhookId: next.webhook_id,
                contentTemplate: next.content_template,
                useEmbed: next.use_embed === 1,
                embedTemplateJson: next.embed_template_json,
                conditionsJson: next.conditions_json,
                enabled: next.enabled === 1,
                webhookUsernameOverride: next.webhook_username_override,
                webhookAvatarUrlOverride: next.webhook_avatar_url_override,
            });
            await refetch();
        },
        onToggle: async (id, enabled) => {
            const session = identityStore.session$();
            if (session === null) return;
            await toggleAutoHook(guildId, id, { userId: session.id, enabled, autoHookName: nameFor(id) });
            await refetch();
        },
        onDelete: async (id) => {
            const session = identityStore.session$();
            if (session === null) return;
            await deleteAutoHook(guildId, id, { userId: session.id, autoHookName: nameFor(id) });
            await refetch();
        },
    };
}

function valueOptionsKey(triggerType: string, field: string): string {
    return `${triggerType}::${field}`;
}

export function buildAutoHooksMode(guildId: string): Instance {
    const root = div({ classes: [AUTO_HOOKS_ROOT_CLASS], context: null, meta: null }, [
        paragraph({ classes: [DISCORD_PANE_PLACEHOLDER_CLASS], text: LOADING_TEXT, context: null, meta: null }),
    ]);
    const state: ModeState = {
        autoHooks: [],
        webhooks: [],
        tokens: [],
        channels: [],
        valueOptions: new Map(),
        pendingFetches: new Set(),
        valueOptionsListeners: new Set(),
    };

    function getValueOptions(triggerType: string, field: string): readonly string[] {
        const key = valueOptionsKey(triggerType, field);
        const cached = state.valueOptions.get(key);
        if (cached !== undefined) return cached;
        if (state.pendingFetches.has(key)) return EMPTY_VALUES;
        state.pendingFetches.add(key);
        void fetchConditionValueOptions(guildId, triggerType, field).then((values) => {
            state.valueOptions.set(key, values);
            state.pendingFetches.delete(key);
            for (const listener of state.valueOptionsListeners) listener();
        });
        return EMPTY_VALUES;
    }

    function subscribeValueOptions(listener: () => void): () => void {
        state.valueOptionsListeners.add(listener);
        return () => {
            state.valueOptionsListeners.delete(listener);
        };
    }

    function render(): void {
        const triggerOptions = buildTriggerOptions();
        const channelNameById = buildChannelNameMap(state.channels);
        const webhookOptions = buildWebhookOptions(state.webhooks, state.tokens, channelNameById);
        if (webhookOptions.length === 0) {
            root.setChildren(
                paragraph({
                    classes: [DISCORD_PANE_PLACEHOLDER_CLASS],
                    text: NO_WEBHOOKS_TEXT,
                    context: null,
                    meta: null,
                }),
            );
            return;
        }
        const callbacks = buildCallbacks(guildId, state, refetch);
        const list = buildAutoHooksList({
            rows: state.autoHooks,
            triggerOptions,
            webhookOptions,
            cb: callbacks,
            getValueOptions,
            subscribeValueOptions,
        });
        const createFlow = buildAutoHookCreateFlow({
            guildId,
            triggerOptions,
            webhookOptions,
            onCreated: () => {
                void refetch();
            },
        });
        root.setChildren(list, createFlow);
    }

    async function refetch(): Promise<void> {
        const loaded = await loadConfigured(guildId);
        state.autoHooks = loaded.autoHooks;
        state.tokens = loaded.tokens;
        render();
    }

    const channelsFeed = createChannelsFeed(guildId);
    const unsubscribeChannels = channelsFeed.source.subscribe(
        (snap) => {
            state.channels = snap.rows as DiscordChannel[];
            render();
        },
        (batch) => {
            const byKey = new Map(state.channels.map((c) => [c.channel_id, c]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordChannel);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            state.channels = [...byKey.values()];
            render();
        },
    );
    const webhooksFeed = createWebhooksFeed(guildId);
    const unsubscribeWebhooks = webhooksFeed.source.subscribe(
        (snap) => {
            state.webhooks = snap.rows as DiscordWebhook[];
            render();
        },
        (batch) => {
            const byKey = new Map(state.webhooks.map((w) => [w.webhook_id, w]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordWebhook);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            state.webhooks = [...byKey.values()];
            render();
        },
    );
    void refetch();

    const unsubscribeAutoHooks = openAutoHooksStream(guildId, () => {
        void refetch();
    });

    let mounted = true;
    queueMicrotask(() => {
        if (!mounted) return;
        inspectorOverride$.set(() => [buildPreviewPane()]);
    });

    root.trackDispose({
        dispose: () => {
            mounted = false;
            unsubscribeChannels();
            unsubscribeWebhooks();
            unsubscribeAutoHooks();
            inspectorOverride$.set(null);
            clearPreviewState();
        },
    });
    return root;
}
