import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    effect,
    heading,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    rsnTag,
    snapshot,
    span,
    type Instance,
} from "../../../factory";
import type { LiveSession } from "../../../../state/identity/profile/profile-client.js";
import { profileStore } from "../../../../state/identity/stores/profile-store.js";
import { clansClient, type ManagedClan } from "../../../../state/clans/clans-client/index.js";
import { META_CLASS, PRIMARY_CLASS, ROW_CLASS } from "../shared/row-classes";
import { buildClanManagerRequests } from "./manager-requests";
import { buildClanWhitelist } from "./whitelist";
import {
    ACCOUNT_CLAN_ACTIONS_ROW_CLASS,
    ACCOUNT_CLAN_DETAILS_CLASS,
    ACCOUNT_CLAN_DETAILS_SUBTITLE_CLASS,
    ACCOUNT_CLAN_FOOTER_CLASS,
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_CLAN_SESSIONS_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
    ACCOUNT_REMOVE_BTN_CLASS,
} from "../../../../shared/constants/account-constants.js";

function buildSessionSummaryRow(s: LiveSession): Instance {
    const matched =
        s.autoVerifyReason === "owner_deputy"
            ? "matched: Owner/Deputy rank"
            : s.autoVerifyReason === "rank_whitelist"
              ? `matched: rank ${s.inGameClanRank ?? "?"} (rank-whitelist)`
              : s.autoVerifyReason === "account_binding"
                ? "matched: account binding"
                : "matched: ?";
    const rank = s.inGameClanRank ?? null;
    return div({ classes: [ROW_CLASS], context: null, meta: null }, [
        span({ classes: [PRIMARY_CLASS], context: null, meta: null }, [
            rsnTag({ rsn: s.rsn, rank, context: null, meta: null }),
        ]),
        span({ classes: [META_CLASS], text: `${rank ?? "unknown"} · ${matched}`, context: null, meta: null }),
    ]);
}

interface SessionsRenderer {
    render: (clanId: string, sessions: LiveSession[]) => void;
}

function createSessionsRenderer(panel: Instance): SessionsRenderer {
    const rowPool = new Map<string, Instance>();
    const sessionsList = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    panel.setChildren(
        heading("h4", {
            classes: [ACCOUNT_CLAN_DETAILS_SUBTITLE_CLASS],
            text: "Currently Live on RuneLite",
            context: null,
            meta: null,
        }),
        sessionsList,
    );

    function render(clanId: string, sessions: LiveSession[]): void {
        const here = sessions.filter((s) => s.managerClanId === clanId && s.managerVerified);
        if (here.length === 0) {
            for (const inst of rowPool.values()) inst.destroy();
            rowPool.clear();
            panel.el.hidden = true;
            return;
        }
        panel.el.hidden = false;
        const live = new Set<string>();
        for (const s of here) {
            live.add(s.rsn);
            if (!rowPool.has(s.rsn)) rowPool.set(s.rsn, buildSessionSummaryRow(s));
        }
        for (const [key, inst] of rowPool) {
            if (!live.has(key)) {
                inst.destroy();
                rowPool.delete(key);
            }
        }
        let nextEl: ChildNode | null = sessionsList.el.firstChild;
        for (const s of here) {
            const inst = rowPool.get(s.rsn);
            if (inst === undefined) continue;
            if (inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
            else sessionsList.addBefore(inst, nextEl);
        }
    }

    return { render };
}

export function buildClanDetails(clan: ManagedClan): Instance {
    const viewBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "View clan",
        context: "open this clan's public page",
        meta: ["nav", "clan"],
        onClick: () => {
            window.location.assign(`/clans/${clan.slug}`);
        },
    });

    const manageBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Manage clan",
        context: "open this clan's management surface",
        meta: ["nav", "clan"],
        onClick: () => {
            window.location.assign(`/clans/${clan.slug}/manage`);
        },
    });

    const actionsRow = div({ classes: [ACCOUNT_CLAN_ACTIONS_ROW_CLASS], context: null, meta: null }, [
        viewBtn,
        manageBtn,
    ]);

    const removeHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const removeBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [ACCOUNT_REMOVE_BTN_CLASS],
        text: "Remove clan",
        context: "permanently delete this clan and all its data",
        meta: ["destructive", "clan"],
        onClick: async () => {
            const confirmed = await inlineConfirm(removeHost, {
                cancelLabel: "Cancel",
                confirmLabel: "Delete forever",
                danger: true,
                cancelContext: `keep clan "${clan.displayName}"`,
                confirmContext: `confirm deleting clan "${clan.displayName}" and all its data`,
            });
            if (!confirmed) return;
            const ok = await clansClient.removeClan(clan.slug);
            if (ok) {
                window.location.reload();
                return;
            }
            removeBtn.setText("Remove failed");
        },
    });
    removeHost.addChild(removeBtn);

    const transferBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Request ownership transfer",
        context: "request transfer of this clan's ownership",
        meta: ["action", "clan"],
        onClick: async () => {
            const result = await clansClient.requestTransfer(clan.slug);
            transferBtn.setText(
                snapshot(result.ok ? "Transfer succeeded" : `Transfer failed: ${result.message ?? result.reason}`),
            );
        },
    });

    const sessionsPanel = div({
        classes: [ACCOUNT_CLAN_PANEL_CLASS, ACCOUNT_CLAN_SESSIONS_CLASS],
        context: null,
        meta: null,
    });
    sessionsPanel.el.hidden = true;

    const actionsPanel = div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Actions", context: null, meta: null }),
        actionsRow,
        removeHost,
    ]);

    const whitelistSection = buildClanWhitelist(clan);
    const requestsSection = buildClanManagerRequests(clan);
    const transferFooter = div({ classes: [ACCOUNT_CLAN_FOOTER_CLASS], context: null, meta: null }, [transferBtn]);

    const details = div({ classes: [ACCOUNT_CLAN_DETAILS_CLASS], context: null, meta: null }, [
        sessionsPanel,
        actionsPanel,
        whitelistSection,
        requestsSection,
        transferFooter,
    ]);
    const sessionsRenderer = createSessionsRenderer(sessionsPanel);
    details.trackDispose(effect(() => sessionsRenderer.render(clan.id, profileStore.sessions$())));
    return details;
}
