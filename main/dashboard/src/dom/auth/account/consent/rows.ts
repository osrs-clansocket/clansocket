import { button, derived, div, effect, span, type Instance } from "../../../factory";
import type { ConsentRecord } from "../../../../state/identity/consent/consent-client.js";
import { timeStore } from "../../../../state/stores/time-store";
import { glassConfirm } from "../../../forms/glass/modals/glass-confirm.js";
import {
    ACCOUNT_DEVICE_ROW_CLASS,
    ACCOUNT_ROW_META_CLASS,
    ACCOUNT_ROW_PRIMARY_CLASS,
    ACCOUNT_TOKEN_REVOKE_CLASS,
    ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS,
} from "../../../../shared/constants/account-constants.js";
import {
    KIND_LABELS,
    STATUS_LABELS,
    cancelConsent,
    formatRelativeAge,
    formatRemaining,
    primaryText,
    setStatus,
} from "./format.js";

export function buildPendingRow(r: ConsentRecord, refresh: () => void, status: Instance): Instance {
    const meta = span({
        classes: [ACCOUNT_ROW_META_CLASS],
        context: null,
        meta: null,
        text: derived(() => formatRemaining(r.expiresAt, timeStore.now$())),
    });
    let expired = false;
    const cancel = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS, ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS],
        text: "Cancel",
        context: "cancel this pending consent request",
        meta: ["action"],
        onClick: async () => {
            const clan = r.declaredClanName ? ` against ${r.declaredClanName}` : "";
            const kindStr = KIND_LABELS[r.kind] ?? r.kind;
            const confirmed = await glassConfirm({
                title: "Cancel consent request",
                message: `Cancel pending ${kindStr} for '${r.targetRsn}'${clan}? u can re-submit later.`,
                confirmLabel: "Cancel request",
                cancelLabel: "Keep",
                danger: true,
            });
            if (!confirmed) return;
            const result = await cancelConsent(r);
            if (result.ok) {
                setStatus(status, "Cancelled.");
                refresh();
            } else setStatus(status, `Cancel failed: ${result.error}`);
        },
    });
    const row = div({ classes: [ACCOUNT_DEVICE_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [ACCOUNT_ROW_PRIMARY_CLASS], text: primaryText(r), context: null, meta: null }),
        meta,
        cancel,
    ]);
    row.trackDispose(
        effect(() => {
            if (expired) return;
            if (timeStore.now$() >= r.expiresAt) {
                expired = true;
                refresh();
            }
        }),
    );
    return row;
}

export function buildResolvedRow(r: ConsentRecord): Instance {
    const ts = r.resolvedAt ?? r.createdAt;
    return div({ classes: [ACCOUNT_DEVICE_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [ACCOUNT_ROW_PRIMARY_CLASS], text: primaryText(r), context: null, meta: null }),
        span({
            classes: [ACCOUNT_ROW_META_CLASS],
            text: `${STATUS_LABELS[r.status]} · ${formatRelativeAge(ts)}`,
            context: null,
            meta: null,
        }),
    ]);
}
