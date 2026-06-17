import {
    button,
    div,
    effect,
    icon,
    image,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    snapshot,
    span,
    type Instance,
    type ReadSignal,
} from "../../../../../factory/index.js";
import { rowSummary } from "../../../../../../state/data-rights/summary.js";
import { pkKeyOf } from "../../../../../../state/data-rights/page-state/row-helpers.js";
import { resolveColumnAsset } from "../../../../../../state/data-rights/assets/asset-resolver.js";
import { tableMeta } from "../../../../../../state/data-rights/table-meta.js";
import {
    DR_ROW_ASSET_CLASS,
    DR_ROW_ASSET_EMPTY_CLASS,
    DR_ROW_BUTTON_CLASS,
    DR_ROW_DELETE_CLASS,
    DR_ROW_ITEM_CLASS,
    DR_ROW_META_CLASS,
    DR_ROW_PRIMARY_CLASS,
    DR_ROW_SECONDARY_CLASS,
} from "../../../../../../shared/constants/data-rights-route-constants.js";
import { IS_SELECTED_CLASS } from "../../../../../../shared/constants/state-modifier-constants.js";

export interface DataRowCtx {
    table: string;
    pkCols: readonly string[];
    tsCol: string | null;
    secretColumns: readonly string[];
    canDeleteRow: boolean;
    selectedKey: ReadSignal<string | null>;
    onSelect: (key: string) => void;
    onDelete: (key: string) => void;
}

interface RowCellRefs {
    primary: Instance;
    secondary: Instance | null;
    meta: Instance | null;
    assetEl: HTMLImageElement;
}

const cellRefs = new WeakMap<HTMLElement, RowCellRefs>();
const EMPTY_SRC = "";

function liveDeleteButton(key: string, table: string, onDelete: (key: string) => void): Instance {
    const host = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const btn = button(
        {
            classes: [DR_ROW_DELETE_CLASS],
            ariaLabel: "Delete row",
            title: "Delete row",
            type: "button",
            context: "delete this row",
            meta: ["destructive", "data"],
            onClick: async (e) => {
                e.stopPropagation();
                const ok = await inlineConfirm(host, {
                    cancelLabel: "Keep",
                    confirmLabel: "Delete",
                    danger: true,
                    cancelContext: `keep this row in ${table}`,
                    confirmContext: `confirm deleting this row from ${table}`,
                });
                if (ok) onDelete(key);
            },
        },
        [icon({ name: "trash", context: null, meta: null })],
    );
    host.addChild(btn);
    return host;
}

function resolvePrimaryAsset(table: string, row: Record<string, unknown>): string | null {
    const meta = tableMeta(table);
    if (meta.summary) {
        for (const c of [meta.summary.primary, meta.summary.secondary, meta.summary.updated]) {
            if (!c) continue;
            const asset = resolveColumnAsset(table, c, row[c], row);
            if (asset !== null) return asset;
        }
    }
    for (const c of Object.keys(row)) {
        const asset = resolveColumnAsset(table, c, row[c], row);
        if (asset !== null) return asset;
    }
    return null;
}

function applyAssetInPlace(el: HTMLImageElement, src: string | null): void {
    if (src === null) {
        el.removeAttribute("src");
        el.classList.add(DR_ROW_ASSET_EMPTY_CLASS);
        return;
    }
    if (el.getAttribute("src") !== src) el.src = src;
    el.classList.remove(DR_ROW_ASSET_EMPTY_CLASS);
}

export function mountDataRow(row: Record<string, unknown>, ctx: DataRowCtx): Instance {
    const key = pkKeyOf(row, ctx.pkCols);
    const sum = rowSummary({
        table: ctx.table,
        row,
        pkCols: ctx.pkCols,
        tsCol: ctx.tsCol,
        secretColumns: ctx.secretColumns,
    });
    const initialAsset = resolvePrimaryAsset(ctx.table, row);
    const assetInst = image({
        src: initialAsset ?? EMPTY_SRC,
        alt: snapshot(sum.primary),
        classes: [DR_ROW_ASSET_CLASS],
        lazy: true,
        context: null,
        meta: null,
    });
    if (initialAsset === null) assetInst.toggleClass(DR_ROW_ASSET_EMPTY_CLASS, true);
    const primary = span({ classes: [DR_ROW_PRIMARY_CLASS], text: snapshot(sum.primary), context: null, meta: null });
    const secondary = sum.secondary
        ? span({ classes: [DR_ROW_SECONDARY_CLASS], text: snapshot(sum.secondary), context: null, meta: null })
        : null;
    const meta = sum.meta
        ? span({ classes: [DR_ROW_META_CLASS], text: snapshot(sum.meta), context: null, meta: null })
        : null;
    const buttonChildren: Instance[] = [assetInst, primary];
    if (secondary) buttonChildren.push(secondary);
    if (meta) buttonChildren.push(meta);
    const rowButton = button(
        {
            ariaLabel: sum.primary,
            classes: [DR_ROW_BUTTON_CLASS],
            type: "button",
            context: "open this row's details",
            meta: ["action", "data"],
            onClick: () => ctx.onSelect(key),
        },
        buttonChildren,
    );
    const children: Instance[] = [rowButton];
    if (ctx.canDeleteRow) children.push(liveDeleteButton(key, ctx.table, ctx.onDelete));
    const wrap = div({ classes: [DR_ROW_ITEM_CLASS], context: null, meta: null }, children);
    wrap.trackDispose(effect(() => wrap.toggleClass(IS_SELECTED_CLASS, ctx.selectedKey() === key)));
    cellRefs.set(wrap.el, { primary, secondary, meta, assetEl: assetInst.el });
    return wrap;
}

export function patchDataRow(inst: Instance, row: Record<string, unknown>, ctx: DataRowCtx): void {
    const refs = cellRefs.get(inst.el);
    if (!refs) return;
    const sum = rowSummary({
        table: ctx.table,
        row,
        pkCols: ctx.pkCols,
        tsCol: ctx.tsCol,
        secretColumns: ctx.secretColumns,
    });
    refs.primary.setText(snapshot(sum.primary));
    if (refs.secondary) refs.secondary.setText(snapshot(sum.secondary ?? ""));
    if (refs.meta) refs.meta.setText(snapshot(sum.meta ?? ""));
    applyAssetInPlace(refs.assetEl, resolvePrimaryAsset(ctx.table, row));
}
