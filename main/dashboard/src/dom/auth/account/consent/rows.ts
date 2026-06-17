import {
    button,
    derived,
    div,
    effect,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    span,
    type Instance,
} from "../../../factory";
import type { ConsentRecord } from "../../../../state/identity/consent/consent-client.js";
import { timeStore } from "../../../../state/stores/time-store";
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
    const cancelHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const cancel = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS, ACCOUNT_TOKEN_REVOKE_NEUTRAL_CLASS],
        text: "Cancel",
        context: "cancel this pending consent request",
        meta: ["action"],
        onClick: async () => {
            const kindStr = KIND_LABELS[r.kind] ?? r.kind;
            const confirmed = await inlineConfirm(cancelHost, {
                cancelLabel: "Keep",
                confirmLabel: "Cancel request",
                danger: true,
                cancelContext: `keep the pending ${kindStr} request for '${r.targetRsn}'`,
                confirmContext: `confirm cancelling the pending ${kindStr} request for '${r.targetRsn}'`,
            });
            if (!confirmed) return;
            const result = await cancelConsent(r);
            if (result.ok) {
                setStatus(status, "Cancelled.");
                refresh();
            } else setStatus(status, `Cancel failed: ${result.error}`);
        },
    });
    cancelHost.addChild(cancel);
    const row = div({ classes: [ACCOUNT_DEVICE_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [ACCOUNT_ROW_PRIMARY_CLASS], text: primaryText(r), context: null, meta: null }),
        meta,
        cancelHost,
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
