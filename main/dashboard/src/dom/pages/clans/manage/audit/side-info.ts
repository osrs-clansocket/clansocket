import { applyEffects, div, snapshot, span, type Child, type Instance } from "../../../../factory";
import { clansClient, type ClanAuditEntry } from "../../../../../state/clans/clans-client/index.js";
import { glassConfirm } from "../../../../forms/glass/modals/glass-confirm.js";
import { fmtSpan, tallySemantic } from "../../../../../state/clans/audit/format.js";
import {
    AUDIT_INTEGRITY_BROKEN_CLASS,
    AUDIT_INTEGRITY_CHECKING_CLASS,
    AUDIT_INTEGRITY_CLASS,
    AUDIT_INTEGRITY_LABEL_CLASS,
    AUDIT_INTEGRITY_OK_CLASS,
    AUDIT_STATS_BREAKDOWN_CLASS,
    AUDIT_STATS_CLASS,
    AUDIT_STATS_SPAN_CLASS,
    AUDIT_STATS_TOTAL_CLASS,
} from "../../../../../shared/constants/audit-route-constants.js";

interface IntegrityState {
    ok: boolean;
    breakAtId: number | null;
    breakReason: string | null;
    rowsChecked: number;
}

export function buildIntegrityIndicator(slug: string, list: Instance): Instance {
    const label = span({
        classes: [AUDIT_INTEGRITY_LABEL_CLASS],
        text: "Verifying…",
        context: null,
        meta: null,
    });
    const host = div(
        {
            classes: [AUDIT_INTEGRITY_CLASS],
            context: "show the audit chain integrity status and jump to a broken entry",
            meta: ["action", "audit"],
            onClick: () => void explainAndJump(),
        },
        [label],
    );
    let last: IntegrityState = { ok: false, breakAtId: null, breakReason: null, rowsChecked: 0 };

    const refresh = async (): Promise<void> => {
        label.setText("Verifying…");
        host.el.className = `${AUDIT_INTEGRITY_CLASS} ${AUDIT_INTEGRITY_CHECKING_CLASS}`;
        const result = await clansClient.verifyClanAuditChain(slug);
        last = result;
        if (result.ok) {
            host.el.className = `${AUDIT_INTEGRITY_CLASS} ${AUDIT_INTEGRITY_OK_CLASS}`;
            label.setText(snapshot(`Chain ok · ${result.rowsChecked} rows`));
        } else {
            host.el.className = `${AUDIT_INTEGRITY_CLASS} ${AUDIT_INTEGRITY_BROKEN_CLASS}`;
            label.setText(
                snapshot(
                    result.breakAtId !== null
                        ? `chain broken at #${result.breakAtId} (${result.breakReason ?? "?"})`
                        : "chain broken",
                ),
            );
        }
    };

    const explainAndJump = async (): Promise<void> => {
        if (last.ok) {
            await glassConfirm({
                title: "Audit chain ok",
                message: `Verified ${last.rowsChecked} ${last.rowsChecked === 1 ? "row" : "rows"}. Every entry's hash and chain link match — no row altered or removed since insertion.`,
                confirmLabel: "OK",
                cancelLabel: "Close",
            });
            return;
        }
        const breakAt = last.breakAtId;
        const reason = last.breakReason ?? "unknown";
        const reasonText =
            reason === "row_hash_mismatch"
                ? "Row content no longer matches its stored hash. The row was modified after insert, or a code path wrote without rehashing."
                : reason === "prev_hash_mismatch"
                  ? "This row's prev_hash points at the wrong predecessor. A row was deleted, re-ordered, or inserted out of band."
                  : `Unknown reason: ${reason}`;
        const guidance =
            "If you didnt manually edit the db, this is a ClanSocket bug — report it. Integrity passed at insert; a break means tamper or a bypassing code path.\n\nClick 'Show row' to jump to the broken entry. Itll highlight for review.";
        const confirmed = await glassConfirm({
            title: `Chain broken at #${breakAt}`,
            message: `${reasonText}\n\n${guidance}`,
            confirmLabel: breakAt === null ? "OK" : "Show row",
            cancelLabel: "Close",
            danger: true,
        });
        if (!confirmed || breakAt === null) return;
        const target = list.el.querySelector<HTMLElement>(`[data-key="audit-${breakAt}"]`);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            applyEffects(target, { name: "flash-attention", once: true });
        } else {
            await glassConfirm({
                title: "Row not loaded",
                message: `Row #${breakAt} isnt in the currently rendered range. Clear filters and click 'Load more' to expand, then try again.`,
                confirmLabel: "OK",
                cancelLabel: "Close",
            });
        }
    };

    void refresh();
    return host;
}

export interface AggregateStats {
    total: number;
    bySource: Record<string, number>;
    bySemantic: Record<string, number>;
    earliestTs: number | null;
    latestTs: number | null;
}

export function emptyStats(): AggregateStats {
    return { total: 0, bySource: {}, bySemantic: {}, earliestTs: null, latestTs: null };
}

export function updateStats(stats: AggregateStats, entry: ClanAuditEntry): void {
    stats.total += 1;
    stats.bySource[entry.source] = (stats.bySource[entry.source] ?? 0) + 1;
    const sem = tallySemantic(entry.action);
    stats.bySemantic[sem] = (stats.bySemantic[sem] ?? 0) + 1;
    if (stats.earliestTs === null || entry.ts < stats.earliestTs) stats.earliestTs = entry.ts;
    if (stats.latestTs === null || entry.ts > stats.latestTs) stats.latestTs = entry.ts;
}

export function buildAnalyticsStrip(stats: AggregateStats): Instance {
    const total = stats.total;
    const children: Child[] = [
        span({
            classes: [AUDIT_STATS_TOTAL_CLASS],
            text: `${total} ${total === 1 ? "entry" : "entries"}`,
            context: null,
            meta: null,
        }),
    ];
    const writes = stats.bySemantic.write ?? 0;
    const destructive = stats.bySemantic.destructive ?? 0;
    const reads = stats.bySemantic.read ?? 0;
    const clientChain = stats.bySemantic.chain ?? 0;
    const breakdown = [
        writes > 0 ? `${writes} writes` : null,
        destructive > 0 ? `${destructive} destructive` : null,
        reads > 0 ? `${reads} reads` : null,
        clientChain > 0 ? `${clientChain} client` : null,
    ].filter((s): s is string => s !== null);
    if (breakdown.length > 0) {
        children.push(
            span({
                classes: [AUDIT_STATS_BREAKDOWN_CLASS],
                text: breakdown.join(" · "),
                context: null,
                meta: null,
            }),
        );
    }
    const span_ = fmtSpan(stats.earliestTs, stats.latestTs);
    if (span_.length > 0) {
        children.push(
            span({
                classes: [AUDIT_STATS_SPAN_CLASS],
                text: snapshot(`Spanning ${span_}`),
                context: null,
                meta: null,
            }),
        );
    }
    return div({ classes: [AUDIT_STATS_CLASS], context: null, meta: null }, children);
}
