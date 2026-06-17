import "../../../../../styles/pages/clans/manage/wise-old-man-page.css";
import {
    anchor,
    BTN_VARIANT_OUTLINE,
    BTN_VARIANT_PRIMARY,
    button,
    createLiveStore,
    div,
    effect,
    heading,
    image,
    input,
    liveView,
    paragraph,
    signal,
    span,
    type Instance,
    type LiveSource,
    type LiveViewHandle,
} from "../../../../factory";
import { label as labelEl } from "../../../../factory/content-ops/form/input-label.js";
import { rsnTag } from "../../../../factory/data-ops/rsn-tag.js";
import { inlineConfirm, INLINE_CONFIRM_HOST_CLASS } from "../../../../factory/layout-ops/inline/inline-confirm.js";
import { FORM_INPUT } from "../../../../forms/form-classes.js";
import { identityStore } from "../../../../../state/identity/stores/identity-store.js";
import { womStoreFor } from "../../../../../state/wom/stores/wom-store.js";
import {
    getWomGroupDetails,
    linkWom,
    revokeWom,
    syncWomNow,
    updateWomNow,
    type WomGroupDetails,
    type WomGroupMembership,
    type WomLinkedStatus,
    type WomStatus,
} from "../../../../../state/wom/clients/wom-client.js";
import type { ReadSignal } from "../../../../factory/reactive";

const ROOT_CLASS = "clans-manage__wise-old-man";
const HEAD_CLASS = "clans-manage__wise-old-man-head";
const BRAND_ICON_CLASS = "clans-manage__wise-old-man-brand-icon";
const TITLE_CLASS = "clans-manage__wise-old-man-title";
const LOADING_CLASS = "clans-manage__wise-old-man-loading";
const HINT_CLASS = "clans-manage__wise-old-man-hint";
const FORM_CLASS = "clans-manage__wise-old-man-form";
const FORM_FIELD_CLASS = "clans-manage__wise-old-man-field";
const FORM_LABEL_CLASS = "clans-manage__wise-old-man-label";
const SUBMIT_BTN_CLASS = "clans-manage__wise-old-man-submit";
const STATUS_LINE_CLASS = "clans-manage__wise-old-man-status-line";

const SECTION_CLASS = "clans-manage__wise-old-man-section";
const SECTION_TITLE_CLASS = "clans-manage__wise-old-man-section-title";
const IDENTITY_NAME_CLASS = "clans-manage__wise-old-man-identity-name";
const IDENTITY_DESC_CLASS = "clans-manage__wise-old-man-identity-desc";
const META_ROW_CLASS = "clans-manage__wise-old-man-meta-row";
const META_CHIP_CLASS = "clans-manage__wise-old-man-meta-chip";
const META_LABEL_CLASS = "clans-manage__wise-old-man-meta-label";
const META_VALUE_CLASS = "clans-manage__wise-old-man-meta-value";
const VERIFIED_CHIP_CLASS = "clans-manage__wise-old-man-verified";
const EXTERNAL_LINK_CLASS = "clans-manage__wise-old-man-external-link";
const MEMBERS_TABLE_CLASS = "clans-manage__wise-old-man-members";
const MEMBER_ROW_CLASS = "clans-manage__wise-old-man-member-row";
const MEMBER_ROLE_CLASS = "clans-manage__wise-old-man-member-role";
const MEMBER_NAME_CLASS = "clans-manage__wise-old-man-member-name";
const MEMBER_META_CLASS = "clans-manage__wise-old-man-member-meta";
const INTERNAL_GRID_CLASS = "clans-manage__wise-old-man-internal";
const INTERNAL_ROW_CLASS = "clans-manage__wise-old-man-internal-row";
const INTERNAL_LABEL_CLASS = "clans-manage__wise-old-man-internal-label";
const INTERNAL_VALUE_CLASS = "clans-manage__wise-old-man-internal-value";
const ACTIONS_CLASS = "clans-manage__wise-old-man-actions";
const ACTION_HOST_CLASS = "clans-manage__wise-old-man-action-host";
const FEEDBACK_CLASS = "clans-manage__wise-old-man-feedback";
const FUSED_CLASS = "clans-manage__wise-old-man-fused";

const BRAND_ICON_SRC = "/resources/clan/wise_old_man.webp";
const BRAND_TITLE = "Wise Old Man";
const WOM_GROUP_URL_BASE = "https://wiseoldman.net/groups/";
const LOADING_TEXT = "Loading WoM link status…";
const DETAILS_LOADING_TEXT = "Loading group details from WoM…";
const NOT_LINKED_LEDE =
    "Paste your clan's WoM group ID + verification code (from wiseoldman.net). API key optional, raises rate limit.";
const SUBMIT_LINK_BTN = "Link";
const RELINK_BTN = "Re-link";
const UNLINK_BTN = "Unlink";
const SYNC_NOW_BTN = "Sync now";
const UPDATE_NOW_BTN = "Update WoM";
const OPEN_WOM_BTN = "Open on wiseoldman.net";
const ERR_REQUIRED = "Group ID (positive number) and verification code are required.";
const STATUS_LINKING = "Linking…";
const STATUS_LINKED = "Linked.";
const SYNC_RUNNING = "Sync triggered. Updates land over the next few minutes.";
const SYNC_GATED_PREFIX = "Already synced. Next sync available ";
const SYNC_UNAVAILABLE = "Sync failed.";
const UPDATE_RUNNING = "Asked WoM to refresh all members from Jagex hiscores. May take several minutes.";
const UPDATE_FAILED = "Update request failed.";
const UNLINK_DONE = "Unlinked.";
const UNLINK_CANCEL_CTX = "cancel unlinking the WoM group";
const UNLINK_CONFIRM_CTX = "confirm unlinking the WoM group (revokes credentials)";

const ISO_DATE_END = 10;
const NONE_VALUE = "—";
const MINS_PER_HOUR = 60;
const MINS_PER_DAY = 60 * 24;
const MS_PER_MIN = 60_000;

function formatMsAsDate(ms: number | null): string {
    if (ms === null) return NONE_VALUE;
    return new Date(ms).toISOString().slice(0, ISO_DATE_END);
}

function formatIsoAsDate(iso: string | null | undefined): string {
    if (typeof iso !== "string" || iso.length === 0) return NONE_VALUE;
    return iso.slice(0, ISO_DATE_END);
}

function formatEta(targetMs: number, nowMs: number = Date.now()): string {
    const diffMs = targetMs - nowMs;
    if (diffMs <= 0) return "now";
    const minutes = Math.round(diffMs / MS_PER_MIN);
    if (minutes < MINS_PER_HOUR) return `in ${minutes} min`;
    if (minutes < MINS_PER_DAY) return `in ${Math.round(minutes / MINS_PER_HOUR)} h`;
    return `in ${Math.round(minutes / MINS_PER_DAY)} d`;
}

function brandHead(): Instance {
    return div({ classes: [HEAD_CLASS], context: null, meta: null }, [
        image({ src: BRAND_ICON_SRC, alt: BRAND_TITLE, classes: [BRAND_ICON_CLASS], context: null, meta: null }),
        heading("h2", { classes: [TITLE_CLASS], text: BRAND_TITLE, context: null, meta: null }),
    ]);
}

function metaChip(label: string, value: string): Instance {
    return div({ classes: [META_CHIP_CLASS], context: null, meta: null }, [
        span({ classes: [META_LABEL_CLASS], text: label, context: null, meta: null }),
        span({ classes: [META_VALUE_CLASS], text: value, context: null, meta: null }),
    ]);
}

interface MemberTileRefs {
    roleText: Instance;
    metaText: Instance;
}

const memberRefs = new WeakMap<Instance, MemberTileRefs>();

function mountMemberRow(row: Record<string, unknown>): Instance {
    const m = row as unknown as WomGroupMembership;
    const role = m.role;
    const roleText = span({ classes: [MEMBER_ROLE_CLASS], text: role ?? NONE_VALUE, context: null, meta: null });
    const rsnTagInst = rsnTag({
        rsn: m.player.displayName,
        rank: role,
        size: "sm",
        classes: [MEMBER_NAME_CLASS],
        context: null,
        meta: null,
    });
    const metaText = span({
        classes: [MEMBER_META_CLASS],
        text: formatIsoAsDate(m.player.updatedAt),
        context: null,
        meta: null,
    });
    const tile = div({ classes: [MEMBER_ROW_CLASS], context: null, meta: null }, [roleText, rsnTagInst, metaText]);
    memberRefs.set(tile, { roleText, metaText });
    return tile;
}

function patchMemberRow(inst: Instance, row: Record<string, unknown>): void {
    const m = row as unknown as WomGroupMembership;
    const refs = memberRefs.get(inst);
    if (!refs) return;
    refs.roleText.setText(m.role ?? NONE_VALUE);
    refs.metaText.setText(formatIsoAsDate(m.player.updatedAt));
}

function detailsAsMembersSource(slug: string, detailsSignal: ReadSignal<WomGroupDetails | null>): LiveSource {
    return {
        subscribe(onSnapshot, _onDelta): () => void {
            let seq = 0;
            const disp = effect(() => {
                const details = detailsSignal();
                const rows = (details?.memberships ?? []).map((m) => m as unknown as Record<string, unknown>);
                seq += 1;
                onSnapshot({ topic: `wom-members:${slug}`, seq, rows });
            });
            return () => disp.dispose();
        },
    };
}

interface LinkFormValues {
    groupId: number;
    verificationCode: string;
    apiKey?: string;
}

function buildLinkForm(slug: string, onLinked: () => void): Instance {
    const groupIdInput = input({
        type: "number",
        classes: [FORM_INPUT],
        attrs: { inputmode: "numeric", placeholder: "12345" },
        context: null,
        meta: null,
    });
    const codeInput = input({
        type: "password",
        classes: [FORM_INPUT],
        attrs: { autocomplete: "off", spellcheck: "false" },
        context: null,
        meta: null,
    });
    const keyInput = input({
        type: "password",
        classes: [FORM_INPUT],
        attrs: { autocomplete: "off", spellcheck: "false" },
        context: null,
        meta: null,
    });
    const statusLine = paragraph({ classes: [STATUS_LINE_CLASS], text: "", context: null, meta: null });

    function readForm(): LinkFormValues | null {
        const rawGroupId = (groupIdInput.el as HTMLInputElement).value.trim();
        const code = (codeInput.el as HTMLInputElement).value.trim();
        const apiKey = (keyInput.el as HTMLInputElement).value.trim();
        if (rawGroupId.length === 0 || code.length === 0) return null;
        const numericGroupId = Number(rawGroupId);
        if (Number.isNaN(numericGroupId) || numericGroupId <= 0) return null;
        const out: LinkFormValues = { groupId: numericGroupId, verificationCode: code };
        if (apiKey.length > 0) out.apiKey = apiKey;
        return out;
    }

    async function handleSubmit(): Promise<void> {
        const form = readForm();
        if (form === null) {
            statusLine.setText(ERR_REQUIRED);
            return;
        }
        statusLine.setText(STATUS_LINKING);
        const result = await linkWom(slug, form);
        if (!result.ok) {
            statusLine.setText(`Link failed: ${result.reason ?? "unknown"}`);
            return;
        }
        statusLine.setText(STATUS_LINKED);
        onLinked();
    }

    function field(label: string, control: Instance): Instance {
        return div({ classes: [FORM_FIELD_CLASS], context: null, meta: null }, [
            labelEl({ classes: [FORM_LABEL_CLASS], text: label, htmlFor: "", context: null, meta: null }),
            control,
        ]);
    }

    return div({ classes: [FORM_CLASS], context: null, meta: null }, [
        field("Group ID", groupIdInput),
        field("Verification code", codeInput),
        field("API key (optional)", keyInput),
        button({
            classes: [SUBMIT_BTN_CLASS],
            variant: BTN_VARIANT_PRIMARY,
            compact: true,
            text: SUBMIT_LINK_BTN,
            context: "submit the WoM credentials to link the clan's WoM group",
            meta: ["submit"],
            onClick: handleSubmit,
        }),
        statusLine,
    ]);
}

function buildNotLinkedView(slug: string, onLinked: () => void): Instance {
    return div({ classes: [ROOT_CLASS], context: null, meta: null }, [
        brandHead(),
        paragraph({ classes: [HINT_CLASS], text: NOT_LINKED_LEDE, context: null, meta: null }),
        buildLinkForm(slug, onLinked),
    ]);
}

interface IdentityPanelLiveHandle {
    instance: Instance;
    dispose: () => void;
}

function buildIdentityPanelLive(
    status: WomLinkedStatus,
    detailsSignal: ReadSignal<WomGroupDetails | null>,
): IdentityPanelLiveHandle {
    const nameEl = heading("h3", {
        classes: [IDENTITY_NAME_CLASS],
        text: status.cached_group_name,
        context: null,
        meta: null,
    });
    const descEl = paragraph({ classes: [IDENTITY_DESC_CLASS], text: "", context: null, meta: null });
    descEl.el.hidden = true;
    const metaRow = div({ classes: [META_ROW_CLASS], context: null, meta: null });
    const externalLink = anchor({
        href: `${WOM_GROUP_URL_BASE}${status.wom_group_id}`,
        text: OPEN_WOM_BTN,
        target: "_blank",
        rel: "noopener noreferrer",
        classes: [EXTERNAL_LINK_CLASS],
        context: "open this WoM group page in a new tab",
        meta: ["nav"],
    });
    const panel = div({ classes: [SECTION_CLASS], context: null, meta: null }, [nameEl, descEl, metaRow, externalLink]);

    const disp = effect(() => {
        const details = detailsSignal();
        nameEl.setText(details?.name ?? status.cached_group_name);
        const desc = details?.description ?? null;
        if (typeof desc === "string" && desc.length > 0) {
            descEl.setText(desc);
            descEl.el.hidden = false;
        } else {
            descEl.setText("");
            descEl.el.hidden = true;
        }
        const chips: Instance[] = [];
        if (details !== null) {
            chips.push(metaChip("Clan chat", details.clanChat));
            chips.push(metaChip("Members", String(details.memberCount)));
            chips.push(metaChip("Score", String(details.score)));
            chips.push(metaChip("Homeworld", details.homeworld !== null ? String(details.homeworld) : NONE_VALUE));
            chips.push(metaChip("Created", formatIsoAsDate(details.createdAt)));
            if (details.verified) {
                chips.push(span({ classes: [VERIFIED_CHIP_CLASS], text: "Verified", context: null, meta: null }));
            }
        } else {
            chips.push(metaChip("Group ID", String(status.wom_group_id)));
        }
        metaRow.setChildren(...chips);
    });

    return { instance: panel, dispose: () => disp.dispose() };
}

interface MembersPanelLiveHandle {
    instance: Instance;
    dispose: () => void;
}

function buildMembersPanelLive(
    slug: string,
    detailsSignal: ReadSignal<WomGroupDetails | null>,
): MembersPanelLiveHandle {
    const headingEl = heading("h3", { classes: [SECTION_TITLE_CLASS], text: "Members", context: null, meta: null });
    const loadingEl = paragraph({
        classes: [HINT_CLASS],
        text: DETAILS_LOADING_TEXT,
        context: null,
        meta: null,
    });
    const grid = div({ classes: [MEMBERS_TABLE_CLASS], context: null, meta: null });
    const section = div({ classes: [SECTION_CLASS], context: null, meta: null }, [headingEl, loadingEl, grid]);

    const store = createLiveStore<Record<string, unknown>>({
        topic: `wom-members:${slug}`,
        keyOf: (row) => String((row as unknown as WomGroupMembership).playerId),
        source: detailsAsMembersSource(slug, detailsSignal),
    });
    const view: LiveViewHandle = liveView<Record<string, unknown>>({
        container: grid,
        store,
        mountRow: mountMemberRow,
        patchRow: patchMemberRow,
    });
    view.start();

    const loadingDisp = effect(() => {
        const details = detailsSignal();
        loadingEl.el.hidden = details !== null;
    });

    return {
        instance: section,
        dispose: () => {
            view.teardown();
            loadingDisp.dispose();
        },
    };
}

interface InternalStatusPanelLiveHandle {
    instance: Instance;
    dispose: () => void;
}

function buildInternalStatusPanelLive(statusSignal: () => WomStatus): InternalStatusPanelLiveHandle {
    function internalRow(label: string, valueInst: Instance): Instance {
        return div({ classes: [INTERNAL_ROW_CLASS], context: null, meta: null }, [
            span({ classes: [INTERNAL_LABEL_CLASS], text: label, context: null, meta: null }),
            valueInst,
        ]);
    }
    const linkerHost = div({ classes: [INTERNAL_VALUE_CLASS], context: null, meta: null });
    const lastVerifiedText = span({ classes: [INTERNAL_VALUE_CLASS], text: NONE_VALUE, context: null, meta: null });
    const lastBackfillText = span({ classes: [INTERNAL_VALUE_CLASS], text: NONE_VALUE, context: null, meta: null });

    const grid = div({ classes: [INTERNAL_GRID_CLASS], context: null, meta: null }, [
        internalRow("Linked by", linkerHost),
        internalRow("Last verified", lastVerifiedText),
        internalRow("Last backfill", lastBackfillText),
    ]);
    const section = div({ classes: [SECTION_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [SECTION_TITLE_CLASS], text: "ClanSocket status", context: null, meta: null }),
        grid,
    ]);

    let renderedLinkerKey = "";
    const disp = effect(() => {
        const status = statusSignal();
        if (!status.linked) {
            linkerHost.setChildren(span({ text: NONE_VALUE, context: null, meta: null }));
            lastVerifiedText.setText(NONE_VALUE);
            lastBackfillText.setText(NONE_VALUE);
            renderedLinkerKey = "";
            return;
        }
        const linkerKey = `${status.linker_rsn ?? ""}|${status.linker_rank ?? ""}|${status.linker_site_account_id}`;
        if (linkerKey !== renderedLinkerKey) {
            renderedLinkerKey = linkerKey;
            if (status.linker_rsn !== null && status.linker_rsn.length > 0) {
                linkerHost.setChildren(
                    rsnTag({
                        rsn: status.linker_rsn,
                        rank: status.linker_rank,
                        size: "sm",
                        context: null,
                        meta: null,
                    }),
                );
            } else {
                linkerHost.setChildren(span({ text: status.linker_site_account_id, context: null, meta: null }));
            }
        }
        lastVerifiedText.setText(formatMsAsDate(status.last_verified_at));
        lastBackfillText.setText(formatMsAsDate(status.last_backfill_at));
    });

    return { instance: section, dispose: () => disp.dispose() };
}

interface ActionsConfig {
    slug: string;
    refresh: () => void;
    onRelink: () => void;
    setFeedback: (msg: string) => void;
}

function buildActionsRow(cfg: ActionsConfig): Instance {
    let unlinkHost: Instance | null = null;
    const updateBtn = button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: UPDATE_NOW_BTN,
        context: "ask WoM to refresh all members' hiscores from Jagex now",
        meta: ["action"],
        onClick: async () => {
            cfg.setFeedback("Asking WoM to update…");
            const result = await updateWomNow(cfg.slug);
            if (result.ok) {
                cfg.setFeedback(UPDATE_RUNNING);
                return;
            }
            cfg.setFeedback(`${UPDATE_FAILED} (${result.reason ?? "unknown"})`);
        },
    });
    const syncBtn = button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: SYNC_NOW_BTN,
        context: "trigger an immediate WoM backfill if the 24h gate allows",
        meta: ["action"],
        onClick: async () => {
            cfg.setFeedback("Syncing…");
            const result = await syncWomNow(cfg.slug);
            if (result.ok) {
                cfg.setFeedback(SYNC_RUNNING);
                cfg.refresh();
                return;
            }
            if (result.reason === "gated" && typeof result.next_eligible_at === "number") {
                cfg.setFeedback(`${SYNC_GATED_PREFIX}${formatEta(result.next_eligible_at)}.`);
                return;
            }
            cfg.setFeedback(`${SYNC_UNAVAILABLE} (${result.reason ?? "unknown"})`);
        },
    });
    const relinkBtn = button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: RELINK_BTN,
        context: "re-link WoM credentials with a new group / code / api key",
        meta: ["action"],
        onClick: cfg.onRelink,
    });
    const unlinkBtn = button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: UNLINK_BTN,
        context: "revoke WoM credentials and clear the link",
        meta: ["destructive"],
        onClick: async () => {
            if (unlinkHost === null) return;
            const confirmed = await inlineConfirm(unlinkHost, {
                danger: true,
                cancelLabel: "Cancel",
                confirmLabel: "Unlink",
                cancelContext: UNLINK_CANCEL_CTX,
                confirmContext: UNLINK_CONFIRM_CTX,
            });
            if (!confirmed) return;
            const result = await revokeWom(cfg.slug);
            if (result.ok) {
                cfg.setFeedback(UNLINK_DONE);
                cfg.refresh();
                return;
            }
            cfg.setFeedback(`Unlink failed: ${result.reason ?? "unknown"}.`);
        },
    });
    unlinkHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS, ACTION_HOST_CLASS], context: null, meta: null }, [
        unlinkBtn,
    ]);
    return div({ classes: [ACTIONS_CLASS], context: null, meta: null }, [updateBtn, syncBtn, relinkBtn, unlinkHost]);
}

interface LinkedShellHandle {
    instance: Instance;
    dispose: () => void;
}

interface LinkedShellConfig {
    slug: string;
    status: WomLinkedStatus;
    currentUserId: string;
    refresh: () => void;
    onRelink: () => void;
    statusSignal: () => WomStatus;
    detailsSignal: ReadSignal<WomGroupDetails | null>;
    feedbackSignal: ReadSignal<string>;
    setFeedback: (msg: string) => void;
}

function buildLinkedShell(cfg: LinkedShellConfig): LinkedShellHandle {
    const canMutate = cfg.status.linker_site_account_id === cfg.currentUserId;
    const identityHandle = buildIdentityPanelLive(cfg.status, cfg.detailsSignal);
    const membersHandle = buildMembersPanelLive(cfg.slug, cfg.detailsSignal);
    const statusHandle = buildInternalStatusPanelLive(cfg.statusSignal);

    const fusedChildren: Instance[] = [identityHandle.instance];
    const disposers: Array<() => void> = [identityHandle.dispose, membersHandle.dispose, statusHandle.dispose];

    if (canMutate) {
        fusedChildren.push(
            buildActionsRow({
                slug: cfg.slug,
                refresh: cfg.refresh,
                onRelink: cfg.onRelink,
                setFeedback: cfg.setFeedback,
            }),
        );
        const feedbackEl = paragraph({ classes: [FEEDBACK_CLASS], text: "", context: null, meta: null });
        feedbackEl.el.hidden = true;
        fusedChildren.push(feedbackEl);
        const feedbackDisp = effect(() => {
            const msg = cfg.feedbackSignal();
            feedbackEl.setText(msg);
            feedbackEl.el.hidden = msg.length === 0;
        });
        disposers.push(() => feedbackDisp.dispose());
    }
    fusedChildren.push(membersHandle.instance);

    const sections: Instance[] = [
        brandHead(),
        div({ classes: [FUSED_CLASS], context: null, meta: null }, fusedChildren),
        statusHandle.instance,
    ];

    if (!canMutate) {
        sections.push(
            paragraph({
                classes: [HINT_CLASS],
                text: `Linked by ${cfg.status.linker_site_account_id}. Only they (or the clan owner) can re-link or revoke.`,
                context: null,
                meta: null,
            }),
        );
    }

    const root = div({ classes: [ROOT_CLASS], context: null, meta: null }, sections);
    return {
        instance: root,
        dispose: () => {
            for (const d of disposers) d();
        },
    };
}

export function buildWiseOldManTab(slug: string): HTMLElement {
    const store = womStoreFor(slug);
    const showLinkForm = signal<boolean>(false);
    const detailsSignal = signal<WomGroupDetails | null>(null);
    const feedbackSignal = signal<string>("");
    const host = div({ classes: [ROOT_CLASS], context: null, meta: null }, [
        paragraph({ classes: [LOADING_CLASS], text: LOADING_TEXT, context: null, meta: null }),
    ]);

    let linkedShell: LinkedShellHandle | null = null;
    let mountedKind: "loading" | "not-linked" | "linked" = "loading";
    let mountedLinkerKey = "";

    async function fetchDetailsIfLinked(): Promise<void> {
        if (!store.status$().linked) {
            detailsSignal.set(null);
            return;
        }
        const details = await getWomGroupDetails(slug);
        detailsSignal.set(details);
    }

    function refreshAndCloseForm(): void {
        showLinkForm.set(false);
        void store.refresh();
        void fetchDetailsIfLinked();
    }

    function tearDownLinked(): void {
        if (linkedShell) {
            linkedShell.dispose();
            linkedShell = null;
        }
    }

    function mountNotLinked(): void {
        if (mountedKind === "not-linked") return;
        tearDownLinked();
        host.setChildren(buildNotLinkedView(slug, refreshAndCloseForm));
        mountedKind = "not-linked";
        mountedLinkerKey = "";
    }

    function mountLinked(status: WomLinkedStatus, currentUserId: string): void {
        const linkerKey = `${status.linker_site_account_id}|${currentUserId}`;
        if (mountedKind === "linked" && linkerKey === mountedLinkerKey) return;
        tearDownLinked();
        linkedShell = buildLinkedShell({
            slug,
            status,
            currentUserId,
            refresh: refreshAndCloseForm,
            onRelink: () => showLinkForm.set(true),
            statusSignal: () => store.status$(),
            detailsSignal,
            feedbackSignal,
            setFeedback: (msg) => feedbackSignal.set(msg),
        });
        host.setChildren(linkedShell.instance);
        mountedKind = "linked";
        mountedLinkerKey = linkerKey;
    }

    void store.ensure().then(() => void fetchDetailsIfLinked());
    effect(() => {
        const status = store.status$();
        const session = identityStore.session$();
        const uid = session?.id ?? "";
        const showForm = showLinkForm();
        if (!status.linked || showForm) {
            mountNotLinked();
            return;
        }
        mountLinked(status, uid);
    });

    return host.el;
}
