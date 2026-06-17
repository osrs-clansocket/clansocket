import {
    applyEffects,
    BTN_VARIANT_BARE,
    BTN_VARIANT_OUTLINE,
    button,
    div,
    icon,
    paragraph,
    slidePanel,
    snapshot,
    span,
    type Child,
    type Instance,
    type SlidePanelInstance,
} from "../../../../factory";
import { clansClient, type ClanAuditEntry } from "../../../../../state/clans/clans-client/index.js";
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

// Single-row banner helpers. message sits in column 1 (1fr) and its position
// inside that column is controlled by CSS reading the panel's
// data-slide-panel-align attribute (start/center/end). actions cluster sits
// in column 2 (auto) — always pinned to the right edge of the banner.
function buildPanelMessage(text: string): Instance {
    const inst = paragraph({ classes: [], text, context: null, meta: null });
    inst.el.style.fontSize = "var(--fs-sm)";
    inst.el.style.lineHeight = "var(--lh-normal)";
    inst.el.style.color = "var(--base-graphite-300)";
    inst.el.style.margin = "0";
    return inst;
}

function buildActionsCluster(children: Instance[]): Instance {
    const inst = div({ classes: [], context: null, meta: null }, children);
    inst.el.style.display = "flex";
    inst.el.style.alignItems = "center";
    inst.el.style.gap = "var(--sp-2)";
    inst.el.style.flexShrink = "0";
    return inst;
}

function buildPanelRow(message: Instance, actions: Instance): Instance {
    const row = div({ classes: [], context: null, meta: null }, [message, actions]);
    row.el.style.display = "grid";
    row.el.style.gridTemplateColumns = "1fr auto";
    row.el.style.alignItems = "start";
    row.el.style.gap = "var(--sp-2)";
    row.el.style.inlineSize = "100%";
    return row;
}

function applyIconBtnGap(inst: Instance): Instance {
    inst.el.style.gap = "var(--sp-1)";
    inst.el.style.alignItems = "center";
    return inst;
}

export function buildIntegrityIndicator(slug: string, list: Instance): Instance {
    const label = span({
        classes: [AUDIT_INTEGRITY_LABEL_CLASS],
        text: "Verifying…",
        context: null,
        meta: null,
    });
    const trigger = div(
        {
            classes: [AUDIT_INTEGRITY_CLASS],
            context: "show the audit chain integrity status and jump to a broken entry",
            meta: ["action", "audit"],
        },
        [label],
    );
    let last: IntegrityState = { ok: false, breakAtId: null, breakReason: null, rowsChecked: 0 };

    const refresh = async (): Promise<void> => {
        label.setText("Verifying…");
        trigger.el.className = `${AUDIT_INTEGRITY_CLASS} ${AUDIT_INTEGRITY_CHECKING_CLASS}`;
        const result = await clansClient.verifyClanAuditChain(slug);
        last = result;
        if (result.ok) {
            trigger.el.className = `${AUDIT_INTEGRITY_CLASS} ${AUDIT_INTEGRITY_OK_CLASS}`;
            label.setText(snapshot(`Chain ok · ${result.rowsChecked} rows`));
        } else {
            trigger.el.className = `${AUDIT_INTEGRITY_CLASS} ${AUDIT_INTEGRITY_BROKEN_CLASS}`;
            label.setText(
                snapshot(
                    result.breakAtId !== null
                        ? `chain broken at #${result.breakAtId} (${result.breakReason ?? "?"})`
                        : "chain broken",
                ),
            );
        }
    };

    const panelHost = div({ classes: [], context: null, meta: null });
    let slidePanelInst: SlidePanelInstance | null = null;

    function buildCloseIconBtn(): Instance {
        const inst = applyIconBtnGap(
            button(
                {
                    classes: [],
                    variant: BTN_VARIANT_BARE,
                    compact: true,
                    ariaLabel: "Close",
                    context: "close the integrity status panel",
                    meta: ["action"],
                    onClick: () => slidePanelInst?.close(),
                },
                [icon({ name: "x-lg", classes: [], context: null, meta: null })],
            ),
        );
        inst.el.style.color = "var(--base-gold-300)";
        return inst;
    }

    function buildShowRowBtn(breakAt: number): Instance {
        return applyIconBtnGap(
            button(
                {
                    classes: [],
                    variant: BTN_VARIANT_OUTLINE,
                    compact: true,
                    context: "scroll to and highlight the broken audit entry",
                    meta: ["action"],
                    onClick: () => showRow(breakAt),
                },
                [
                    span({ classes: [], text: "Show row", context: null, meta: null }),
                    icon({ name: "chevron-right", classes: [], context: null, meta: null }),
                ],
            ),
        );
    }

    function renderRowNotLoaded(breakAt: number): void {
        panelHost.setChildren(
            buildPanelRow(
                buildPanelMessage(
                    `Row #${breakAt} isnt in the currently rendered range. Clear filters and click 'Load more' to expand, then try again.`,
                ),
                buildActionsCluster([buildCloseIconBtn()]),
            ),
        );
    }

    function reasonText(reason: string): string {
        if (reason === "row_hash_mismatch") {
            return "Row content no longer matches its stored hash. The row was modified after insert, or a code path wrote without rehashing.";
        }
        if (reason === "prev_hash_mismatch") {
            return "This row's prev_hash points at the wrong predecessor. A row was deleted, re-ordered, or inserted out of band.";
        }
        return `Unknown reason: ${reason}`;
    }

    function showRow(breakAt: number): void {
        const target = list.el.querySelector<HTMLElement>(`[data-key="audit-${breakAt}"]`);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            applyEffects(target, { name: "flash-attention", once: true });
            slidePanelInst?.close();
            return;
        }
        renderRowNotLoaded(breakAt);
    }

    function renderPanelContent(): void {
        if (last.ok) {
            panelHost.setChildren(
                buildPanelRow(
                    buildPanelMessage(
                        `Verified ${last.rowsChecked} ${last.rowsChecked === 1 ? "row" : "rows"}. Every entry's hash and chain link match — no row altered or removed since insertion.`,
                    ),
                    buildActionsCluster([buildCloseIconBtn()]),
                ),
            );
            return;
        }
        const breakAt = last.breakAtId;
        const reason = last.breakReason ?? "unknown";
        const message = `${reasonText(reason)}\n\nIf you didnt manually edit the db, this is a ClanSocket bug — report it. Integrity passed at insert; a break means tamper or a bypassing code path.`;
        const actions: Instance[] = [];
        if (breakAt !== null) actions.push(buildShowRowBtn(breakAt));
        actions.push(buildCloseIconBtn());
        panelHost.setChildren(buildPanelRow(buildPanelMessage(message), buildActionsCluster(actions)));
    }

    slidePanelInst = slidePanel(
        {
            onOpen: () => renderPanelContent(),
            onClose: () => panelHost.clear(),
            bannerMode: true,
            context: null,
            meta: null,
        },
        trigger,
        panelHost,
    );
    slidePanelInst.el.style.marginInlineStart = "auto";

    void refresh();
    return slidePanelInst;
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
