import { BTN_VARIANT_PRIMARY, button, div, effect, signal, type Instance } from "../../../factory";
import { consentsStore } from "../../../../state/identity/stores/consents-store.js";
import type { ConsentRecord } from "../../../../state/identity/consent/consent-client.js";
import { identityClient } from "../../../../state/identity/identity-client/index.js";
import { timeStore } from "../../../../state/stores/time-store";
import { buildClaimBanner, effectiveStatus, recordToActive, type ActiveClaim } from "./claim-banner";
import { buildClaimForm } from "./claim-form";
import { ACCOUNT_ADD_CLAN_CLASS } from "../../../../shared/constants/account-constants.js";

function findLatestPendingClaim(rows: readonly ConsentRecord[]): ConsentRecord | null {
    let latest: ConsentRecord | null = null;
    for (const r of rows) {
        if (r.kind !== "claim" || r.status !== "pending") continue;
        if (!latest || r.createdAt > latest.createdAt) latest = r;
    }
    return latest;
}

function findById(rows: readonly ConsentRecord[], id: number): ConsentRecord | null {
    for (const r of rows) {
        if (r.id === id) return r;
    }
    return null;
}

export function buildAddClan(onClaimed: () => void): Instance {
    const activeClaim = signal<ActiveClaim | null>(null);
    let lastResolvedId: number | null = null;

    async function syncFromServer(): Promise<void> {
        await consentsStore.refresh();
        const rows = consentsStore.list$();
        const current = activeClaim();
        if (current === null) {
            const latest = findLatestPendingClaim(rows);
            if (latest) activeClaim.set(recordToActive(latest));
            return;
        }
        const match = findById(rows, current.id);
        if (!match) return;
        const next = recordToActive(match);
        activeClaim.set(next);
        if (next.status === "confirmed" && lastResolvedId !== next.id) {
            lastResolvedId = next.id;
            onClaimed();
        }
    }

    const banner = buildClaimBanner(activeClaim);
    const openBtn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        text: "Claim a clan",
        context: "open the claim-a-clan form",
        meta: ["action", "clan"],
        onClick: () => {
            openBtn.el.hidden = true;
            claimForm.show();
        },
    });

    const claimForm = buildClaimForm({
        onSuccess: (claim) => {
            claimForm.hide();
            activeClaim.set(claim);
            onClaimed();
        },
        onCancel: () => {
            claimForm.hide();
            openBtn.el.hidden = false;
        },
    });

    const container = div({ classes: [ACCOUNT_ADD_CLAN_CLASS], context: null, meta: null }, [
        banner,
        openBtn,
        claimForm.el,
    ]);

    container.trackDispose(
        effect(() => {
            const c = activeClaim();
            const blocked = c !== null && effectiveStatus(c, timeStore.now$()) === "pending";
            if (blocked) {
                openBtn.el.hidden = true;
                claimForm.hide();
            } else if (claimForm.el.hidden) {
                openBtn.el.hidden = false;
            }
        }),
    );

    const unsubscribe = identityClient.openIdentificationStream(() => void syncFromServer());
    container.trackDispose({ dispose: unsubscribe });

    void syncFromServer();

    return container;
}
