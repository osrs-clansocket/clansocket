import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    effect,
    heading,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    paragraph,
    signal,
    span,
    type Instance,
    type Signal,
} from "../../../factory/index.js";
import { identityClient, type LinkedProvider } from "../../../../state/identity/identity-client/index.js";
import { providersStore } from "../../../../state/identity/stores/providers-store.js";
import { FORM_HINT } from "../../../forms/form-classes.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
    ACCOUNT_ROW_CLASS,
    ACCOUNT_ROW_META_CLASS,
    ACCOUNT_ROW_PRIMARY_CLASS,
    ACCOUNT_TOKEN_REVOKE_CLASS,
} from "../../../../shared/constants/account-constants.js";
import { BS_ICON_CLASS } from "../../../../shared/constants/bootstrap-icon-constants.js";

type ProviderName = "github" | "discord";

const PROVIDER_LABEL: Record<ProviderName, string> = {
    github: "GitHub",
    discord: "Discord",
};

const PROVIDER_ICON: Record<ProviderName, string> = {
    github: "bi-github",
    discord: "bi-discord",
};

function linkAction(name: ProviderName): () => void {
    return name === "github" ? () => identityClient.startGithubLink() : () => identityClient.startDiscordLink();
}

function buildLinkButton(name: ProviderName): Instance {
    return button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Link",
        context: `link your ${PROVIDER_LABEL[name]} account as a sign-in method`,
        meta: ["action", "account"],
        onClick: linkAction(name),
    });
}

function buildUnlinkButton(name: ProviderName, labelText: string, onChange: () => void): Instance {
    const host = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const unlinkBtn = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS],
        text: "Unlink",
        context: `unlink ${labelText} as a sign-in method`,
        meta: ["destructive", "account"],
        onClick: async () => {
            const confirmed = await inlineConfirm(host, {
                cancelLabel: "Cancel",
                confirmLabel: "Unlink",
                danger: true,
                cancelContext: `keep ${labelText} linked`,
                confirmContext: `confirm unlinking ${labelText}`,
            });
            if (!confirmed) return;
            const result = await identityClient.unlinkProvider(name);
            if (result.ok) onChange();
        },
    });
    host.addChild(unlinkBtn);
    return host;
}

function buildProviderRow(name: ProviderName, linked: LinkedProvider | null, onChange: () => void): Instance {
    const labelText = PROVIDER_LABEL[name];
    const metaText = linked === null ? "Not linked" : (linked.displayName ?? "(linked)");
    const action = linked === null ? buildLinkButton(name) : buildUnlinkButton(name, labelText, onChange);
    return div({ classes: [ACCOUNT_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [BS_ICON_CLASS, PROVIDER_ICON[name]], context: null, meta: null }),
        span({ classes: [ACCOUNT_ROW_PRIMARY_CLASS], text: labelText, context: null, meta: null }),
        span({ classes: [ACCOUNT_ROW_META_CLASS], text: metaText, context: null, meta: null }),
        action,
    ]);
}

function renderList(host: Instance, status$: Signal<string>, providers: LinkedProvider[], refresh: () => void): void {
    const byProvider = new Map(providers.map((p) => [p.provider, p]));
    host.setChildren(
        buildProviderRow("github", byProvider.get("github") ?? null, refresh),
        buildProviderRow("discord", byProvider.get("discord") ?? null, refresh),
    );
    status$.set(`${providers.length} of 2 linked`);
}

export function buildLinkedAccountsPanel(): HTMLElement {
    const host = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    const status$ = signal("");
    const status = paragraph({ classes: [FORM_HINT], text: status$, context: null, meta: null });
    const root = div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Linked accounts", context: null, meta: null }),
        div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null }, [host]),
        div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null }, [status]),
    ]);
    root.trackDispose(
        effect(() => renderList(host, status$, providersStore.list$(), () => void providersStore.refresh())),
    );
    return root.el;
}
