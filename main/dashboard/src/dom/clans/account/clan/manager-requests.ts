import { BTN_VARIANT_PRIMARY, button, div, effect, heading, paragraph, span, type Instance } from "../../../factory";
import { clansClient, type ManagedClan } from "../../../../state/clans/clans-client/index.js";
import {
    createManagerRequestsStore,
    type ManagerRequest,
} from "../../../../state/clans/stores/manager-requests-store.js";
import { META_CLASS, ROW_CLASS } from "../shared/row-classes";
import {
    ACCOUNT_CLAN_BRANDING_SECTION_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
} from "../../../../shared/constants/account-constants.js";

export function buildClanManagerRequests(clan: ManagedClan): Instance {
    const list = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    const container = div({ classes: [ACCOUNT_CLAN_BRANDING_SECTION_CLASS], context: null, meta: null }, [
        heading("h3", {
            classes: [ACCOUNT_PANEL_TITLE_CLASS],
            text: "Pending manager requests",
            context: null,
            meta: null,
        }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: "Out-of-clan + wrong-clan users who want manager access.",
            context: null,
            meta: null,
        }),
        list,
    ]);
    container.el.hidden = true;
    const store = createManagerRequestsStore(clan.slug);
    const refresh = (): Promise<void> => store.refresh();
    const requestPool = new Map<string, Instance>();
    container.trackDispose(
        effect(() => {
            const requests = store.requests$();
            container.el.hidden = requests.length === 0;
            const liveIds = new Set<string>();
            for (const r of requests) {
                liveIds.add(r.id);
                if (!requestPool.has(r.id)) requestPool.set(r.id, buildRequestRow(clan.slug, r, refresh));
            }
            for (const [id, inst] of requestPool) {
                if (!liveIds.has(id)) {
                    inst.destroy();
                    requestPool.delete(id);
                }
            }
            let nextEl: ChildNode | null = list.el.firstChild;
            for (const r of requests) {
                const inst = requestPool.get(r.id);
                if (inst === undefined) continue;
                if (inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
                else list.addBefore(inst, nextEl);
            }
        }),
    );
    return container;
}

function buildRequestActions(slug: string, r: ManagerRequest, refresh: () => Promise<void>): [Instance, Instance] {
    const approve = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        text: "Approve",
        context: "approve this manager request",
        meta: ["action", "clan"],
        onClick: async () => {
            await clansClient.approveManagerRequest(slug, r.id);
            await refresh();
        },
    });
    const deny = button({
        compact: true,
        text: "Deny",
        context: "deny this manager request",
        meta: ["destructive", "clan"],
        onClick: async () => {
            await clansClient.denyManagerRequest(slug, r.id);
            await refresh();
        },
    });
    return [approve, deny];
}

function buildRequestRow(slug: string, r: ManagerRequest, refresh: () => Promise<void>): Instance {
    const [approve, deny] = buildRequestActions(slug, r, refresh);
    const verifyLabel = r.pluginVerified ? "✓ plugin-verified" : "⌛ no plugin proof";
    const provider = r.siteAccountProvider ? ` via ${r.siteAccountProvider}` : "";
    const rsnFragment = r.declaredRsn.length > 0 ? ` → rsn:${r.declaredRsn}` : "";
    return div({ classes: [ROW_CLASS], context: null, meta: null }, [
        span({
            classes: [META_CLASS],
            text: `${r.siteAccountDisplay}${provider}${rsnFragment} • ${verifyLabel}`,
            context: null,
            meta: null,
        }),
        approve,
        deny,
    ]);
}
