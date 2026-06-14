import { div, expandWithFade, icon, snapshot, span, type Instance } from "../../../../factory";
import type { ClanAuditEntry } from "../../../../../state/clans/clans-client/index.js";
import { present } from "../../../../../state/clans/audit-presenters/index.js";
import type { ClusterRow } from "../../../../../state/clans/audit/cluster-defs.js";
import { fmtActor, fmtRelative } from "../../../../../state/clans/audit/format.js";
import { isRevertable, loadExpansion } from "./expansion.js";
import {
    AUDIT_ACTION_CLASS,
    AUDIT_ACTOR_CLASS,
    AUDIT_CHEVRON_CLASS,
    AUDIT_DURATION_CLASS,
    AUDIT_EXPANSION_CLASS,
    AUDIT_ICON_CLASS,
    AUDIT_REVERT_CONFIRMED_CLASS,
    AUDIT_ROW_CLASS,
    AUDIT_ROW_CLUSTERED_CLASS,
    AUDIT_ROW_EXPANDABLE_CLASS,
    AUDIT_ROW_OPEN_CLASS,
    AUDIT_ROW_REVERTED_CLASS,
    AUDIT_TARGET_CLASS,
    AUDIT_TS_CLASS,
} from "../../../../../shared/constants/audit-route-constants.js";

interface RowRefs {
    title: Instance;
    ts: Instance;
    detail: Instance;
}

const rowRefs = new WeakMap<HTMLElement, RowRefs>();

function titleText(entry: ClanAuditEntry, count: number): string {
    const base = present(entry).title;
    return count > 1 ? `${base} ×${count}` : base;
}

function attachExpansion(row: Instance, entry: ClanAuditEntry, slug: string): (e: MouseEvent) => void {
    const chevron = span({ classes: [AUDIT_CHEVRON_CLASS], text: "▸", context: null, meta: null });
    const expansion = div({ classes: [AUDIT_EXPANSION_CLASS], hidden: "", context: null, meta: null });
    row.addChild(chevron);
    row.addChild(expansion);
    let loaded = false;
    let open = false;
    const doToggle = async (): Promise<void> => {
        open = !open;
        row.toggleClass(AUDIT_ROW_OPEN_CLASS, open);
        chevron.setText(open ? "▾" : "▸");
        expandWithFade(expansion.el, open);
        if (!open) return;
        if (loaded) return;
        loaded = true;
        const content = await loadExpansion(entry, slug, () => {
            row.toggleClass(AUDIT_ROW_REVERTED_CLASS, true);
            expansion.setChildren(
                span({
                    classes: [AUDIT_REVERT_CONFIRMED_CLASS],
                    text: "Reverted.",
                    context: null,
                    meta: null,
                }),
            );
        });
        expansion.setChildren(content);
    };
    return (e: MouseEvent): void => {
        if (!(e.target instanceof Node) || expansion.el.contains(e.target)) return;
        void doToggle();
    };
}

export function mountClusterRow(cluster: ClusterRow, slug: string): Instance {
    const entry = cluster.head;
    const presented = present(entry);
    const rowClasses = [AUDIT_ROW_CLASS, `${AUDIT_ROW_CLASS}--${presented.semantic}`];
    if (presented.hasExpansion) rowClasses.push(AUDIT_ROW_EXPANDABLE_CLASS);
    if (cluster.count > 1) rowClasses.push(AUDIT_ROW_CLUSTERED_CLASS);

    const iconInst = icon({
        name: presented.icon.replace("bi-", ""),
        classes: [AUDIT_ICON_CLASS],
        context: null,
        meta: null,
    });
    const tsInst = span({
        classes: [AUDIT_TS_CLASS],
        text: snapshot(fmtRelative(entry.ts)),
        context: null,
        meta: null,
    });
    const titleInst = span({
        classes: [AUDIT_ACTION_CLASS],
        text: titleText(entry, cluster.count),
        context: null,
        meta: null,
    }).setAttr("title", entry.action);
    const actor = fmtActor(entry);
    const actorInst = span({ classes: [AUDIT_ACTOR_CLASS], text: snapshot(actor), context: null, meta: null });
    const detailInst = span({
        classes: [AUDIT_TARGET_CLASS],
        text: snapshot(presented.detail),
        context: null,
        meta: null,
    });
    const durationInst = span({
        classes: [AUDIT_DURATION_CLASS],
        text: typeof entry.elapsedMs === "number" ? `${entry.elapsedMs}ms` : "",
        context: null,
        meta: null,
    });

    let toggle: ((e: MouseEvent) => void) | null = null;
    const row = div(
        {
            classes: rowClasses,
            key: `audit-${entry.id}`,
            ariaLabel: `audit #${entry.id} · ${presented.title}${actor && actor !== "system" ? ` · by ${actor}` : ""}`,
            context: "expand or collapse this audit entry's details",
            meta: ["disclosure", "audit"],
            onClick: (e) => toggle?.(e),
        },
        [iconInst, tsInst, titleInst, actorInst, detailInst, durationInst],
    );
    rowRefs.set(row.el, { title: titleInst, ts: tsInst, detail: detailInst });

    if (presented.hasExpansion || isRevertable(entry)) {
        row.toggleClass(AUDIT_ROW_EXPANDABLE_CLASS, true);
        toggle = attachExpansion(row, entry, slug);
    }
    return row;
}

export function patchClusterRow(inst: Instance, cluster: ClusterRow): void {
    const refs = rowRefs.get(inst.el);
    if (!refs) return;
    const entry = cluster.head;
    refs.title.setText(titleText(entry, cluster.count));
    refs.ts.setText(snapshot(fmtRelative(entry.ts)));
    refs.detail.setText(present(entry).detail);
    inst.toggleClass(AUDIT_ROW_CLUSTERED_CLASS, cluster.count > 1);
    inst.setAttr("data-key", `audit-${entry.id}`);
}
