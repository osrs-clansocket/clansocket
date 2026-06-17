import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    paragraph,
    pre,
    snapshot,
    span,
    type Instance,
} from "../../../../factory";
import {
    clansClient,
    type ClanAuditEntry,
    type ClanRosterDiff,
} from "../../../../../state/clans/clans-client/index.js";
import { fmtBeforeAfterValue, fmtDiffEvent } from "../../../../../state/clans/audit/format.js";
import {
    AUDIT_BA_AFTER_CLASS,
    AUDIT_BA_ARROW_CLASS,
    AUDIT_BA_BEFORE_CLASS,
    AUDIT_BA_FIELD_CLASS,
    AUDIT_BA_ROW_CHANGED_CLASS,
    AUDIT_BA_ROW_CLASS,
    AUDIT_DIFF_EMPTY_CLASS,
    AUDIT_DIFF_EVENT_CLASS,
    AUDIT_DIFF_LIST_CLASS,
    AUDIT_DIFF_MEMBER_CLASS,
    AUDIT_DIFF_ROW_CLASS,
    AUDIT_EXPANSION_BODY_CLASS,
    AUDIT_RAW_CLASS,
    AUDIT_RAW_PRE_CLASS,
    AUDIT_REVERT_BTN_CLASS,
    AUDIT_REVERT_CLASS,
} from "../../../../../shared/constants/audit-route-constants.js";

const ACTION_ROSTER_CHANGED = "server:roster.changed";

export const REVERTABLE_ACTIONS = new Set<string>([
    "server:branding.updated",
    "server:manager.granted",
    "server:manager.revoked",
    "server:claim.transferred",
    "server:whitelist.added",
]);

export function isRevertable(entry: ClanAuditEntry): boolean {
    if (!REVERTABLE_ACTIONS.has(entry.action)) return false;
    if (entry.payload?.revertsAuditId !== undefined) return false;
    return true;
}

function buildDiffList(diffs: ClanRosterDiff[]): Instance {
    if (diffs.length === 0) {
        return paragraph({
            classes: [AUDIT_DIFF_EMPTY_CLASS],
            text: "No diff detail.",
            context: null,
            meta: null,
        });
    }
    return div(
        { classes: [AUDIT_DIFF_LIST_CLASS], context: null, meta: null },
        diffs.map((d) =>
            div({ classes: [AUDIT_DIFF_ROW_CLASS], context: null, meta: null }, [
                span({ classes: [AUDIT_DIFF_MEMBER_CLASS], text: d.memberName, context: null, meta: null }),
                span({
                    classes: [AUDIT_DIFF_EVENT_CLASS],
                    text: snapshot(fmtDiffEvent(d)),
                    context: null,
                    meta: null,
                }),
            ]),
        ),
    );
}

function buildBeforeAfterRow(field: string, b: unknown, a: unknown): Instance {
    const changed = JSON.stringify(b ?? null) !== JSON.stringify(a ?? null);
    const rowClasses = [AUDIT_BA_ROW_CLASS];
    if (changed) rowClasses.push(AUDIT_BA_ROW_CHANGED_CLASS);
    return div({ classes: rowClasses, context: null, meta: null }, [
        span({ classes: [AUDIT_BA_FIELD_CLASS], text: field, context: null, meta: null }),
        span({
            classes: [AUDIT_BA_BEFORE_CLASS],
            text: snapshot(fmtBeforeAfterValue(b)),
            context: null,
            meta: null,
        }),
        span({ classes: [AUDIT_BA_ARROW_CLASS], text: "→", context: null, meta: null }),
        span({
            classes: [AUDIT_BA_AFTER_CLASS],
            text: snapshot(fmtBeforeAfterValue(a)),
            context: null,
            meta: null,
        }),
    ]);
}

function buildBeforeAfterDiff(entry: ClanAuditEntry): Instance {
    const before = (entry.payload?.before ?? null) as Record<string, unknown> | null;
    const after = (entry.payload?.after ?? null) as Record<string, unknown> | null;
    if (after === null) {
        return paragraph({
            classes: [AUDIT_DIFF_EMPTY_CLASS],
            text: "No before/after detail.",
            context: null,
            meta: null,
        });
    }
    const fields = new Set<string>();
    if (before) for (const k of Object.keys(before)) fields.add(k);
    for (const k of Object.keys(after)) fields.add(k);
    if (fields.size === 0) {
        return paragraph({
            classes: [AUDIT_DIFF_EMPTY_CLASS],
            text: "No fields changed.",
            context: null,
            meta: null,
        });
    }
    const rows: Instance[] = [];
    for (const field of fields) rows.push(buildBeforeAfterRow(field, before?.[field], after[field]));
    return div({ classes: [AUDIT_DIFF_LIST_CLASS], context: null, meta: null }, rows);
}

function buildRawPayload(entry: ClanAuditEntry): Instance {
    return div({ classes: [AUDIT_RAW_CLASS], context: null, meta: null }, [
        pre({
            classes: [AUDIT_RAW_PRE_CLASS],
            text: JSON.stringify(entry.payload ?? {}, null, 2),
            context: null,
            meta: null,
        }),
    ]);
}

function buildRevertSection(entry: ClanAuditEntry, slug: string, onReverted: () => void): Instance {
    const host = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const btn = button({
        variant: BTN_VARIANT_OUTLINE,
        classes: [AUDIT_REVERT_BTN_CLASS],
        text: "↺ Revert this change",
        key: `revert-${entry.id}`,
        ariaLabel: `Revert audit entry #${entry.id}`,
        context: "revert this audit entry to its prior state",
        meta: ["action", "audit"],
        onClick: async (e) => {
            e.stopPropagation();
            const confirmed = await inlineConfirm(host, {
                cancelLabel: "Cancel",
                confirmLabel: "Revert",
                danger: true,
                cancelContext: `keep audit entry #${entry.id} as-is`,
                confirmContext: `confirm reverting audit entry #${entry.id} to its prior state`,
            });
            if (!confirmed) return;
            btn.el.disabled = true;
            btn.setText("Reverting…");
            const result = await clansClient.revertClanAuditEntry(slug, entry.id);
            if (!result.ok) {
                btn.el.disabled = false;
                btn.setText(snapshot(`↺ Revert failed (${result.reason ?? "?"})`));
                return;
            }
            onReverted();
        },
    });
    host.addChild(btn);
    return div({ classes: [AUDIT_REVERT_CLASS], context: null, meta: null }, [host]);
}

export async function loadExpansion(entry: ClanAuditEntry, slug: string, onReverted: () => void): Promise<Instance> {
    const children: Instance[] = [];
    if (entry.action === ACTION_ROSTER_CHANGED && entry.targetId !== null) {
        const diffs = await clansClient.listRosterDiffs(slug, entry.targetId);
        children.push(buildDiffList(diffs));
    } else if (entry.payload && (entry.payload.before !== undefined || entry.payload.after !== undefined)) {
        children.push(buildBeforeAfterDiff(entry));
    } else {
        children.push(buildRawPayload(entry));
    }
    if (isRevertable(entry)) children.push(buildRevertSection(entry, slug, onReverted));
    return div({ classes: [AUDIT_EXPANSION_BODY_CLASS], context: null, meta: null }, children);
}
