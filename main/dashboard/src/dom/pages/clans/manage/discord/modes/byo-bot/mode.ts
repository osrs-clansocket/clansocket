import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    anchor,
    BTN_VARIANT_BARE,
    BTN_VARIANT_OUTLINE,
    button,
    div,
    effect,
    panel,
    paragraph,
    slidePanel,
    span,
    type Instance,
    type SlidePanelInstance,
} from "../../../../../../factory";
import { buildByoBotInviteUrl } from "../../../../../../../state/discord-byo-bot/builders/byo-bot-invite-url-builder.js";
import { textInput } from "../../../../../../factory/content-ops/form/inputs/text-input.js";
import { label as labelEl } from "../../../../../../factory/content-ops/form/input-label.js";
import { buildSlidePanelCreateForm } from "../../../../../../forms/slide-panels/slide-panel-create-form.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import { byoBotStoreFor } from "../../../../../../../state/discord-byo-bot/stores/byo-bot-store.js";
import {
    bindByoBotToGuild,
    canMutateLinkerForByoBot,
    reassignByoBotLinker,
    revokeByoBot,
    unbindByoBotFromGuild,
    verifyAndLinkByoBot,
    type ByoBotStatus,
} from "../../../../../../../state/discord-byo-bot/clients/byo-bot-client.js";
import { discordServersStoreFor } from "../../../../../../../state/discord/servers-store.js";
import type { DiscordServer } from "../../../../../../../state/discord/client.js";
import { listClanManagers, type ClanManagerRow } from "../../../../../../../state/clans/clans-client/people/index.js";
import { FORM_FIELD, FORM_FIELD_LABEL, FORM_INPUT } from "../../../../../../forms/form-classes.js";
import {
    DISCORD_INSPECTOR_LABEL_ROW_CLASS,
    DISCORD_INSPECTOR_SECTION_CLASS,
    DISCORD_INSPECTOR_VALUE_CLASS,
    DISCORD_PANE_PLACEHOLDER_CLASS,
    DISCORD_PLACEHOLDER_HINT_CLASS,
    PANEL_LABEL_CLASS,
} from "../../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const ROOT_CLASS = "clans-manage__discord-byo-bot";
const ROOT_OVERRIDE_CLASS = "clans-manage__discord-byo-bot--owner-override";
const TOOLBAR_BTN_CLASS = "clans-manage__discord-toolbar-btn";
const FOOTER_HOST_CLASS = "slide-panel__footer";

const LOADING_TEXT = "Loading bot status…";
const LOADING_MANAGERS_TEXT = "Loading clan managers…";
const NONE_VALUE = "—";

const NOT_LINKED_LEDE =
    "Link a Discord bot you own. ClanSocket runs the bot under your token while your tenant keeps ownership.";
const LINK_BTN = "Link";
const RELINK_BTN = "Re-link";
const RELINK_OVERRIDE_BTN = "Re-link (owner override)";
const INVITE_BTN = "Invite to a server →";
const INVITE_BTN_CONTEXT = "open Discord's bot invite OAuth flow in a new tab";
const REVOKE_BTN = "Revoke";
const REVOKE_OVERRIDE_BTN = "Revoke (owner override)";
const REASSIGN_BTN = "Reassign linker";
const BIND_BTN = "Bind to this server";
const CANCEL_BTN = "Cancel";
const SUBMIT_BTN = "Verify and link";
const REASSIGN_EMPTY = "No other clan managers available to reassign to.";
const REASSIGN_LEDE = "Pick a clan manager to become the new linker.";

const LABEL_APP_ID = "Application ID";
const LABEL_BOT_TOKEN = "Bot token";
const LABEL_PUBLIC_KEY = "Public key (optional)";

const ERR_REQUIRED = "Application ID and bot token are required.";

const FIELD_ID_APP_ID = "byo-bot-app-id";
const FIELD_ID_BOT_TOKEN = "byo-bot-token";
const FIELD_ID_PUBLIC_KEY = "byo-bot-public-key";

function inspectorLabelRow(label: string): Instance {
    return div({ classes: [DISCORD_INSPECTOR_LABEL_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [PANEL_LABEL_CLASS], text: label, context: null, meta: null }),
    ]);
}

function statusRow(label: string, value: string): Instance {
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        inspectorLabelRow(label),
        span({ classes: [DISCORD_INSPECTOR_VALUE_CLASS], text: value, context: null, meta: null }),
    ]);
}

function buildField(labelText: string, fieldId: string, control: Instance): Instance {
    return div({ classes: [FORM_FIELD], id: fieldId, context: null, meta: null }, [
        labelEl({ classes: [FORM_FIELD_LABEL], text: labelText, htmlFor: fieldId, context: null, meta: null }),
        control,
    ]);
}

const ISO_DATE_END = 10;

function formatDate(ms: number | null): string {
    if (ms === null) return NONE_VALUE;
    return new Date(ms).toISOString().slice(0, ISO_DATE_END);
}

function compactBtn(text: string, ctx: string, onClick: () => void): Instance {
    return button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text,
        context: ctx,
        meta: ["action"],
        onClick,
    });
}

function buildInviteAnchor(applicationId: string): Instance {
    return anchor({
        href: buildByoBotInviteUrl(applicationId),
        text: INVITE_BTN,
        target: "_blank",
        rel: "noopener noreferrer",
        classes: [TOOLBAR_BTN_CLASS],
        context: INVITE_BTN_CONTEXT,
        meta: ["action", "nav"],
    });
}

interface ConfirmSlidePanelOpts {
    triggerLabel: string;
    triggerContext: string;
    message: string;
    confirmLabel: string;
    confirmContext: string;
    cancelContext: string;
    onConfirm: () => Promise<void>;
    onPanelOpen?: (inst: SlidePanelInstance) => void;
    onPanelClose?: () => void;
}

// Composes the existing slidePanel + button primitives into a confirm flow that
// matches the inlineConfirm + slidePanelCreateForm UX vocabulary: the trigger
// IS the slide-out's trigger; the panel content is the description; the footer
// holds Cancel + Confirm. No new factory primitive — the existing slidePanel
// already handles the open/close transition, BEM, and aria-expanded wiring.
function buildConfirmSlidePanel(opts: ConfirmSlidePanelOpts): SlidePanelInstance {
    const messageEl = paragraph({
        classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
        text: opts.message,
        context: null,
        meta: null,
    });
    const panelHost = div({ classes: [], context: null, meta: null }, [messageEl]);
    const footerHost = div({ classes: [FOOTER_HOST_CLASS], context: null, meta: null });
    footerHost.el.hidden = true;
    let panelInst: SlidePanelInstance | null = null;

    function renderFooter(): void {
        const cancelBtn = button({
            classes: [TOOLBAR_BTN_CLASS],
            variant: BTN_VARIANT_BARE,
            text: CANCEL_BTN,
            context: opts.cancelContext,
            meta: ["action"],
            onClick: () => panelInst?.close(),
        });
        const confirmBtn = button({
            classes: [TOOLBAR_BTN_CLASS],
            variant: BTN_VARIANT_BARE,
            text: opts.confirmLabel,
            context: opts.confirmContext,
            meta: ["submit"],
            onClick: () => {
                panelInst?.close();
                void opts.onConfirm().catch(() => undefined);
            },
        });
        footerHost.setChildren(confirmBtn, cancelBtn);
        footerHost.el.hidden = false;
    }

    const trigger = button({
        classes: [TOOLBAR_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: opts.triggerLabel,
        context: opts.triggerContext,
        meta: ["action"],
    });

    panelInst = slidePanel(
        {
            onOpen: () => {
                renderFooter();
                if (panelInst !== null) opts.onPanelOpen?.(panelInst);
            },
            onClose: () => {
                footerHost.clear();
                footerHost.el.hidden = true;
                opts.onPanelClose?.();
            },
            context: null,
            meta: null,
        },
        trigger,
        panelHost,
    );
    panelInst.addChild(footerHost);
    return panelInst;
}

interface LinkPanelOptions {
    triggerLabel: string;
    onSubmit: (payload: { applicationId: string; botToken: string; publicKey?: string }) => Promise<void>;
    onPanelOpen: (inst: SlidePanelInstance) => void;
    onPanelClose: () => void;
}

function buildLinkPanel(opts: LinkPanelOptions): SlidePanelInstance {
    let appIdInput: Instance | null = null;
    let tokenInput: Instance | null = null;
    let publicKeyInput: Instance | null = null;

    return buildSlidePanelCreateForm({
        triggerLabel: opts.triggerLabel,
        triggerContext: `open the ${opts.triggerLabel.toLowerCase()} form`,
        submitLabel: SUBMIT_BTN,
        submitContext: "submit the bot credentials to verify and link",
        cancelLabel: CANCEL_BTN,
        buildFields: () => {
            const a = textInput({ classes: [FORM_INPUT], context: null, meta: null });
            const t = textInput({ classes: [FORM_INPUT], context: null, meta: null });
            const p = textInput({ classes: [FORM_INPUT], context: null, meta: null });
            appIdInput = a;
            tokenInput = t;
            publicKeyInput = p;
            return [
                buildField(LABEL_APP_ID, FIELD_ID_APP_ID, a),
                buildField(LABEL_BOT_TOKEN, FIELD_ID_BOT_TOKEN, t),
                buildField(LABEL_PUBLIC_KEY, FIELD_ID_PUBLIC_KEY, p),
            ];
        },
        onSubmit: async () => {
            if (appIdInput === null || tokenInput === null || publicKeyInput === null) return "Form not ready.";
            const appId = (appIdInput.el as HTMLInputElement).value;
            const token = (tokenInput.el as HTMLInputElement).value;
            const pk = (publicKeyInput.el as HTMLInputElement).value;
            if (appId.length === 0 || token.length === 0) return ERR_REQUIRED;
            try {
                await opts.onSubmit({
                    applicationId: appId,
                    botToken: token,
                    publicKey: pk.length > 0 ? pk : undefined,
                });
                return undefined;
            } catch (e) {
                return `Link failed: ${(e as Error).message}`;
            }
        },
        onPanelOpen: opts.onPanelOpen,
        onPanelClose: opts.onPanelClose,
    });
}

interface ReassignPanelOptions {
    slug: string;
    currentLinkerId: string;
    onSelect: (userId: string, displayName: string) => Promise<void>;
    onPanelOpen: (inst: SlidePanelInstance) => void;
    onPanelClose: () => void;
}

function buildReassignPanel(opts: ReassignPanelOptions): SlidePanelInstance {
    const panelHost = div({ classes: [], context: null, meta: null });
    let panelInst: SlidePanelInstance | null = null;

    function renderError(message: string): void {
        panelHost.setChildren(
            paragraph({
                classes: [DISCORD_PANE_PLACEHOLDER_CLASS],
                text: message,
                context: null,
                meta: null,
            }),
            compactBtn(CANCEL_BTN, "close the reassign-linker panel after a failure", () => panelInst?.close()),
        );
    }

    async function renderManagers(): Promise<void> {
        panelHost.setChildren(
            paragraph({
                classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
                text: LOADING_MANAGERS_TEXT,
                context: null,
                meta: null,
            }),
        );
        let managers: ClanManagerRow[] = [];
        try {
            managers = await listClanManagers(opts.slug);
        } catch (e) {
            renderError(`Could not load clan managers: ${(e as Error).message}`);
            return;
        }
        const eligible = managers.filter((m) => m.siteAccountId !== opts.currentLinkerId);
        if (eligible.length === 0) {
            panelHost.setChildren(
                paragraph({
                    classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
                    text: REASSIGN_EMPTY,
                    context: null,
                    meta: null,
                }),
                compactBtn(CANCEL_BTN, "close the reassign-linker panel", () => panelInst?.close()),
            );
            return;
        }
        // Selecting a manager from the picker IS the explicit confirmation —
        // the user opened the picker, scanned the managers, clicked one. A
        // second "are you sure?" step was modal and redundant; the picker
        // already gates the decision. Reassign is reversible too (just open
        // the picker again).
        const optionButtons = eligible.map((m) =>
            compactBtn(
                `${m.siteAccountDisplay} (${m.role})`,
                `reassign the BYO bot linker to ${m.siteAccountDisplay}`,
                () => {
                    void opts
                        .onSelect(m.siteAccountId, m.siteAccountDisplay)
                        .then(() => panelInst?.close())
                        .catch((e: unknown) => {
                            renderError(`Reassign failed: ${e instanceof Error ? e.message : "unknown error"}`);
                        });
                },
            ),
        );
        panelHost.setChildren(
            paragraph({ classes: [DISCORD_PLACEHOLDER_HINT_CLASS], text: REASSIGN_LEDE, context: null, meta: null }),
            ...optionButtons,
            compactBtn(CANCEL_BTN, "cancel the reassign-linker action", () => panelInst?.close()),
        );
    }

    const trigger = button({
        classes: [TOOLBAR_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: REASSIGN_BTN,
        context: "open the reassign-linker picker",
        meta: ["action"],
    });

    panelInst = slidePanel(
        {
            onOpen: () => {
                void renderManagers();
                if (panelInst !== null) opts.onPanelOpen(panelInst);
            },
            onClose: () => {
                panelHost.clear();
                opts.onPanelClose();
            },
            context: null,
            meta: null,
        },
        trigger,
        panelHost,
    );
    return panelInst;
}

function buildNotLinkedView(linkPanel: Instance, server: DiscordServer): Instance {
    const lede = `${NOT_LINKED_LEDE} On submit, the bot will be bound to ${server.guild_name}.`;
    return div({ classes: [ROOT_CLASS], context: null, meta: null }, [
        paragraph({ classes: [DISCORD_PLACEHOLDER_HINT_CLASS], text: lede, context: null, meta: null }),
        linkPanel,
    ]);
}

interface LinkedHereViewOptions {
    status: Extract<ByoBotStatus, { linked: true }>;
    currentUserId: string;
    server: DiscordServer;
    relinkPanel: Instance;
    reassignPanel: Instance | null;
    revokeConfirmPanel: SlidePanelInstance;
    unbindConfirmPanel: SlidePanelInstance;
}

function buildLinkedHereView(opts: LinkedHereViewOptions): Instance {
    const { status, currentUserId, server, relinkPanel, reassignPanel, revokeConfirmPanel, unbindConfirmPanel } = opts;
    const gate = canMutateLinkerForByoBot(status, currentUserId);
    const rootClasses = gate.isOwnerOverride ? [ROOT_CLASS, ROOT_OVERRIDE_CLASS] : [ROOT_CLASS];
    const sections: Instance[] = [
        paragraph({
            classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
            text: `Linked. Serving ${server.guild_name}.`,
            context: null,
            meta: null,
        }),
        statusRow("Bot", status.username),
        statusRow("Bot ID", status.bot_id),
        statusRow("Application ID", status.application_id),
        statusRow("Linked by", status.owner_display_name),
        statusRow("Last verified", formatDate(status.last_verified_at)),
        statusRow("Verify status", status.last_verified_status),
    ];
    if (!gate.canMutate) {
        sections.push(
            paragraph({
                classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
                text: `Linked by ${status.owner_display_name}. Only they (or the clan owner) can re-link, revoke, or move routing.`,
                context: null,
                meta: null,
            }),
        );
        return div({ classes: rootClasses, context: null, meta: null }, sections);
    }
    sections.push(relinkPanel);
    sections.push(buildInviteAnchor(status.application_id));
    sections.push(unbindConfirmPanel);
    sections.push(revokeConfirmPanel);
    if (reassignPanel !== null && gate.canReassign) {
        sections.push(reassignPanel);
    }
    return div({ classes: rootClasses, context: null, meta: null }, sections);
}

interface LinkedElsewhereViewOptions {
    status: Extract<ByoBotStatus, { linked: true }>;
    currentUserId: string;
    server: DiscordServer;
    otherGuildNames: string[];
    bindConfirmPanel: SlidePanelInstance;
}

function buildLinkedElsewhereView(opts: LinkedElsewhereViewOptions): Instance {
    const { status, currentUserId, server, otherGuildNames, bindConfirmPanel } = opts;
    const gate = canMutateLinkerForByoBot(status, currentUserId);
    const rootClasses = gate.isOwnerOverride ? [ROOT_CLASS, ROOT_OVERRIDE_CLASS] : [ROOT_CLASS];
    const elsewhereLabel = otherGuildNames.length === 0 ? "another server" : otherGuildNames.join(", ");
    const sections: Instance[] = [
        paragraph({
            classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
            text: `BYO bot '${status.username}' is linked to this clan but currently serves ${elsewhereLabel}. ${server.guild_name} routes through clansocket-default.`,
            context: null,
            meta: null,
        }),
        statusRow("Bot", status.username),
        statusRow("Bot ID", status.bot_id),
        statusRow("Linked by", status.owner_display_name),
    ];
    if (!gate.canMutate) {
        sections.push(
            paragraph({
                classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
                text: `Linked by ${status.owner_display_name}. Only they (or the clan owner) can move routing.`,
                context: null,
                meta: null,
            }),
        );
        return div({ classes: rootClasses, context: null, meta: null }, sections);
    }
    sections.push(buildInviteAnchor(status.application_id));
    sections.push(bindConfirmPanel);
    return div({ classes: rootClasses, context: null, meta: null }, sections);
}

export function buildByoBotMode(slug: string, server: DiscordServer): Instance {
    const store = byoBotStoreFor(slug);
    const serversStore = discordServersStoreFor(slug);
    const content = div({ classes: [], context: null, meta: null }, [
        paragraph({ classes: [DISCORD_PLACEHOLDER_HINT_CLASS], text: LOADING_TEXT, context: null, meta: null }),
    ]);
    let openPanel: SlidePanelInstance | null = null;

    function trackOpen(p: SlidePanelInstance): void {
        openPanel = p;
    }

    function trackClose(): void {
        openPanel = null;
        rebuildMainView();
    }

    async function handleLinkSubmit(payload: {
        applicationId: string;
        botToken: string;
        publicKey?: string;
    }): Promise<void> {
        const result = await verifyAndLinkByoBot(slug, payload, server.guild_id);
        if (!result.ok) {
            throw new Error(result.reason ?? "verify or link failed");
        }
        await store.refresh();
        await serversStore.refresh();
    }

    async function doRevoke(): Promise<void> {
        await revokeByoBot(slug);
        await store.refresh();
        await serversStore.refresh();
    }

    async function doUnbindThisGuild(): Promise<void> {
        await unbindByoBotFromGuild(slug, server.guild_id);
        await serversStore.refresh();
    }

    async function moveBindingToThisGuild(otherBoundGuildIds: string[]): Promise<void> {
        // Single-server BYO semantics: unbind every other guild currently routed
        // to BYO, then bind this one. Each step is idempotent so a partial
        // failure leaves a consistent state — worst case the user re-clicks
        // and the no-ops short-circuit.
        for (const otherId of otherBoundGuildIds) {
            await unbindByoBotFromGuild(slug, otherId);
        }
        await bindByoBotToGuild(slug, server.guild_id);
        await serversStore.refresh();
    }

    async function handleReassignSelect(newLinkerUserId: string, _displayName: string): Promise<void> {
        const result = await reassignByoBotLinker(slug, { newLinkerUserId });
        if (!result.ok) {
            throw new Error(result.reason ?? "unknown");
        }
        await store.refresh();
    }

    function rebuildMainView(): void {
        if (openPanel !== null && openPanel.isOpen()) return;
        const status = store.status$();
        if (!status.linked) {
            const linkPanel = buildLinkPanel({
                triggerLabel: LINK_BTN,
                onSubmit: handleLinkSubmit,
                onPanelOpen: trackOpen,
                onPanelClose: trackClose,
            });
            content.setChildren(buildNotLinkedView(linkPanel, server));
            return;
        }
        const session = identityStore.session$();
        const uid = session?.id ?? "";
        const isRoutingHere = server.bot_id === status.bot_id;
        const gate = canMutateLinkerForByoBot(status, uid);
        const relinkLabel = gate.isOwnerOverride ? RELINK_OVERRIDE_BTN : RELINK_BTN;
        const relinkPanel = buildLinkPanel({
            triggerLabel: relinkLabel,
            onSubmit: handleLinkSubmit,
            onPanelOpen: trackOpen,
            onPanelClose: trackClose,
        });
        const reassignPanel = gate.canReassign
            ? buildReassignPanel({
                  slug,
                  currentLinkerId: status.owner_site_account_id,
                  onSelect: handleReassignSelect,
                  onPanelOpen: trackOpen,
                  onPanelClose: trackClose,
              })
            : null;
        if (isRoutingHere) {
            const revokeLabel = gate.isOwnerOverride ? REVOKE_OVERRIDE_BTN : REVOKE_BTN;
            const revokeConfirmPanel = buildConfirmSlidePanel({
                triggerLabel: revokeLabel,
                triggerContext: "open the revoke-bot confirm panel",
                message:
                    "Revoke the bot credential and unlink? Stops the bot immediately and reverts every guild it serves to clansocket-default.",
                confirmLabel: revokeLabel,
                confirmContext: "confirm revoke the BYO bot and unlink",
                cancelContext: "cancel revoke the BYO bot",
                onConfirm: doRevoke,
                onPanelOpen: trackOpen,
                onPanelClose: trackClose,
            });
            const unbindConfirmPanel = buildConfirmSlidePanel({
                triggerLabel: `Unbind from ${server.guild_name}`,
                triggerContext: `open the unbind-from-${server.guild_name} confirm panel`,
                message: `Stop routing ${server.guild_name} through the BYO bot? This server falls back to clansocket-default. The BYO bot stays linked to the clan and can be bound to another server.`,
                confirmLabel: "Unbind",
                confirmContext: `confirm unbind ${server.guild_name} from the BYO bot`,
                cancelContext: `cancel unbind ${server.guild_name}`,
                onConfirm: doUnbindThisGuild,
                onPanelOpen: trackOpen,
                onPanelClose: trackClose,
            });
            content.setChildren(
                buildLinkedHereView({
                    status,
                    currentUserId: uid,
                    server,
                    relinkPanel,
                    reassignPanel,
                    revokeConfirmPanel,
                    unbindConfirmPanel,
                }),
            );
            return;
        }
        const allServers = serversStore.servers() ?? [];
        const otherBound = allServers.filter((s) => s.bot_id === status.bot_id && s.guild_id !== server.guild_id);
        const otherIds = otherBound.map((s) => s.guild_id);
        const otherNames = otherBound.map((s) => s.guild_name);
        const elsewhereLabel = otherNames.length === 0 ? "the previously-bound server" : otherNames.join(", ");
        const bindConfirmPanel = buildConfirmSlidePanel({
            triggerLabel: `${BIND_BTN}: ${server.guild_name}`,
            triggerContext: `open the bind-to-${server.guild_name} confirm panel`,
            message: `Move BYO routing from ${elsewhereLabel} to ${server.guild_name}? The bot stops serving the previous server (it falls back to clansocket-default) and starts serving this one.`,
            confirmLabel: "Move routing",
            confirmContext: `confirm move BYO routing to ${server.guild_name}`,
            cancelContext: `cancel move BYO routing to ${server.guild_name}`,
            onConfirm: () => moveBindingToThisGuild(otherIds),
            onPanelOpen: trackOpen,
            onPanelClose: trackClose,
        });
        content.setChildren(
            buildLinkedElsewhereView({
                status,
                currentUserId: uid,
                server,
                otherGuildNames: otherNames,
                bindConfirmPanel,
            }),
        );
    }

    void store.ensure();
    void serversStore.ensure();
    effect(() => {
        store.status$();
        serversStore.servers();
        identityStore.session$();
        rebuildMainView();
    });

    return panel({ context: null, meta: null }, [content]);
}
