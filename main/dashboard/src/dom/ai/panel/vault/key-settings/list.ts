import { div } from "../../../../factory/layout-ops/index.js";
import { BTN_VARIANT_OUTLINE, button, paragraph, span } from "../../../../factory/content-ops/index.js";
import { listProviders, moveEntry, removeEntry } from "../../../../../ai/vault/vault/index.js";
import { getProviderConfig } from "../../../../../ai/vault/session.js";
import { events, AppEvents } from "../../../../../managers/events.js";
import { providerLabel } from "../../known-providers.js";
import { EMPTY_CLASS, FORM_ROW_CLASS, LIST_CLASS, ROW_PRIMARY_CLASS, type UnlockedSub } from "./constants.js";
import { redactKey } from "./helpers.js";
import {
    ACCOUNT_TOKEN_REVOKE_CLASS,
    ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS,
    ACCOUNT_VAULT_ROW_CLASS,
    ACCOUNT_VAULT_ROW_FOOT_END_CLASS,
    ACCOUNT_VAULT_ROW_HEAD_CLASS,
    ACCOUNT_VAULT_ROW_HEAD_END_CLASS,
    ACCOUNT_VAULT_ROW_KEY_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export async function renderListView(
    bodyHost: HTMLElement,
    footerHost: HTMLElement,
    setSub: (next: UnlockedSub) => void,
    rerender: () => Promise<void>,
): Promise<void> {
    const providers = await listProviders();
    if (providers.length === 0) {
        paragraph({ classes: [EMPTY_CLASS], text: "No keys.", context: null, meta: null }).mount(bodyHost);
    } else {
        const list = div({ classes: [LIST_CLASS], context: null, meta: null });
        const total = providers.length;
        for (let i = 0; i < total; i++) {
            list.addChild(await buildListRow({ provider: providers[i]!, idx: i, total, setSub, rerender }));
        }
        list.mount(bodyHost);
    }
    const addBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Add key",
        context: "add a new provider API key",
        meta: ["action"],
        onClick: () => {
            setSub({ mode: "add" });
            rerender().catch(() => undefined);
        },
    });
    div({ classes: [FORM_ROW_CLASS], context: null, meta: null }, [addBtn]).mount(footerHost);
}

interface BuildListRowOpts {
    provider: string;
    idx: number;
    total: number;
    setSub: (next: UnlockedSub) => void;
    rerender: () => Promise<void>;
}

async function buildListRow({ provider, idx, total, setSub, rerender }: BuildListRowOpts): Promise<HTMLElement> {
    const config = await getProviderConfig(provider);
    const keyPreview = config ? redactKey(config.apiKey) : "—";
    const upBtn = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS, ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS],
        text: "↑",
        ariaLabel: "Move up",
        type: "button",
        disabled: idx === 0 ? "" : undefined,
        context: "move this provider key up in priority",
        meta: ["action"],
        onClick: () => {
            moveEntry(provider, "up")
                .then(() => {
                    events.emit(AppEvents.AI_VAULT_CHANGED);
                    return rerender();
                })
                .catch(() => undefined);
        },
    });
    const downBtn = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS, ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS],
        text: "↓",
        ariaLabel: "Move down",
        type: "button",
        disabled: idx === total - 1 ? "" : undefined,
        context: "move this provider key down in priority",
        meta: ["action"],
        onClick: () => {
            moveEntry(provider, "down")
                .then(() => {
                    events.emit(AppEvents.AI_VAULT_CHANGED);
                    return rerender();
                })
                .catch(() => undefined);
        },
    });
    const editBtn = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS, ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS],
        text: "Edit",
        type: "button",
        context: "edit this provider key",
        meta: ["action"],
        onClick: () => {
            setSub({ mode: "edit", provider });
            rerender().catch(() => undefined);
        },
    });
    const removeBtn = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS],
        text: "Remove",
        type: "button",
        context: "remove this provider key from your vault",
        meta: ["destructive"],
        onClick: () => {
            removeEntry(provider)
                .then(() => {
                    events.emit(AppEvents.AI_VAULT_CHANGED);
                    return rerender();
                })
                .catch(() => undefined);
        },
    });
    return div({ classes: [ACCOUNT_VAULT_ROW_CLASS], context: null, meta: null }, [
        div({ classes: [ACCOUNT_VAULT_ROW_HEAD_CLASS], context: null, meta: null }, [
            upBtn,
            downBtn,
            span({
                classes: [ROW_PRIMARY_CLASS],
                text: `${idx + 1}. ${providerLabel(provider)}`,
                context: null,
                meta: null,
            }),
        ]),
        div({ classes: [ACCOUNT_VAULT_ROW_HEAD_END_CLASS], context: null, meta: null }, [editBtn]),
        span({ classes: [ACCOUNT_VAULT_ROW_KEY_CLASS], text: keyPreview, context: null, meta: null }),
        div({ classes: [ACCOUNT_VAULT_ROW_FOOT_END_CLASS], context: null, meta: null }, [removeBtn]),
    ]).el;
}
