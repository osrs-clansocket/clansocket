import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    icon,
    image,
    paragraph,
    span,
    type Instance,
} from "../../../../factory/index.js";
import { glassSecret } from "../../../../forms/glass/inputs/glass-secret.js";
import { glassCodeView } from "../../../../forms/glass/modals/glass-codeview.js";
import type { BrowseResponse, Scope } from "../../../../../state/data-rights/data-rights-client/index.js";
import { rowSummary } from "../../../../../state/data-rights/summary.js";
import { resolveColumnAsset } from "../../../../../state/data-rights/assets/asset-resolver.js";
import {
    DR_DETAIL_BODY_CLASS,
    DR_DETAIL_PANE_CLASS,
    DR_EMPTY_CLASS,
    DR_EXPAND_CLASS,
    DR_FIELD_ASSET_CLASS,
    DR_FIELD_CLASS,
    DR_FIELD_LABEL_CLASS,
    DR_FIELD_TEXT_CLASS,
    DR_FIELD_VALUE_CLASS,
    DR_PANE_HEADER_CLASS,
    DR_PANE_TITLE_CLASS,
    DR_SECURITY_NOTE_BODY_CLASS,
    DR_SECURITY_NOTE_CLASS,
    DR_SECURITY_NOTE_ICON_CLASS,
    DR_SECURITY_NOTE_TEXT_CLASS,
    DR_SECURITY_NOTE_TITLE_CLASS,
} from "../../../../../shared/constants/data-rights-route-constants.js";
import { GLASS_PANE_INNER_CLASS } from "../../../../../shared/constants/glass-constants.js";

const LONG_VALUE_THRESHOLD = 80;
const MS_EPOCH_MIN = 1_000_000_000_000;
const ISO_DATETIME_LEN = 19;

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number" && v > MS_EPOCH_MIN)
        return new Date(v).toISOString().replace("T", " ").slice(0, ISO_DATETIME_LEN);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

export interface RowDetailState {
    scope: Scope;
    table: string;
    row: Record<string, unknown> | null;
    info: BrowseResponse | null;
}

export interface RowDetailHandlers {
    onBack?: () => void;
}

function buildExpandIcon(col: string, text: string, isSecret: boolean): Instance {
    const expandIcon = icon({ name: "arrows-angle-expand", context: null, meta: null });
    return button(
        {
            classes: [DR_EXPAND_CLASS],
            type: "button",
            ariaLabel: `View full ${col}`,
            title: "View full",
            context: "open the full field value in a modal viewer",
            meta: ["action", "data"],
            onClick: (e) => {
                e.stopPropagation();
                glassCodeView({ title: col, content: text, secret: isSecret });
            },
        },
        [expandIcon],
    );
}

function buildAssetIcon(src: string | null, alt: string): Instance | null {
    if (src === null) return null;
    return image({
        src,
        alt,
        classes: [DR_FIELD_ASSET_CLASS],
        lazy: true,
        context: null,
        meta: null,
    });
}

function buildFieldValue(col: string, text: string, isSecret: boolean, assetSrc: string | null): Instance {
    const needsExpand = text.length > LONG_VALUE_THRESHOLD || text.includes("\n");
    const valueChildren: Instance[] = [];
    const assetInst = buildAssetIcon(assetSrc, col);
    if (assetInst !== null) valueChildren.push(assetInst);
    if (isSecret) valueChildren.push(glassSecret(text));
    else valueChildren.push(span({ classes: [DR_FIELD_TEXT_CLASS], text, context: null, meta: null }));
    if (needsExpand) valueChildren.push(buildExpandIcon(col, text, isSecret));
    return div({ classes: [DR_FIELD_VALUE_CLASS], context: null, meta: null }, valueChildren);
}

function buildField(
    table: string,
    col: string,
    value: unknown,
    row: Record<string, unknown>,
    secrets: Set<string>,
): Instance {
    const text = formatValue(value);
    const isSecret = secrets.has(col) && text !== "—";
    const assetSrc = resolveColumnAsset(table, col, value, row);
    return div({ classes: [DR_FIELD_CLASS], context: null, meta: null }, [
        span({ classes: [DR_FIELD_LABEL_CLASS], text: col, context: null, meta: null }),
        buildFieldValue(col, text, isSecret, assetSrc),
    ]);
}

function buildHeader(state: RowDetailState, handlers: RowDetailHandlers): Instance {
    const children: Instance[] = [];
    if (handlers.onBack) {
        children.push(
            button({
                variant: BTN_VARIANT_OUTLINE,
                text: "← Rows",
                context: "go back to the row list",
                meta: ["nav", "data"],
                onClick: () => handlers.onBack!(),
            }),
        );
    }
    const titleText =
        state.row && state.info
            ? rowSummary({
                  table: state.table,
                  row: state.row,
                  pkCols: state.info.pkCols,
                  tsCol: state.info.tsCol,
                  secretColumns: state.info.secretColumns,
              }).primary
            : "Row";
    children.push(span({ classes: [DR_PANE_TITLE_CLASS], text: titleText, context: null, meta: null }));
    return div({ classes: [DR_PANE_HEADER_CLASS], context: null, meta: null }, children);
}

function buildSecurityNote(excluded: readonly string[]): Instance {
    const text = `${excluded.length} field(s) hidden from this view: ${excluded.join(", ")}. These hold cryptographic material (hashes, keys, challenge tokens) that cant be reversed — withholding them from your own view limits exposure if your account is ever breached.`;
    return div({ classes: [DR_SECURITY_NOTE_CLASS], context: null, meta: null }, [
        icon({
            name: "shield-lock-fill",
            classes: [DR_SECURITY_NOTE_ICON_CLASS],
            context: null,
            meta: null,
        }),
        div({ classes: [DR_SECURITY_NOTE_BODY_CLASS], context: null, meta: null }, [
            span({
                classes: [DR_SECURITY_NOTE_TITLE_CLASS],
                text: "Kept private for your security",
                context: null,
                meta: null,
            }),
            paragraph({ classes: [DR_SECURITY_NOTE_TEXT_CLASS], text, context: null, meta: null }),
        ]),
    ]);
}

export function buildRowDetail(state: RowDetailState, handlers: RowDetailHandlers): Instance {
    if (!state.row || !state.info) {
        return div({ classes: [GLASS_PANE_INNER_CLASS, DR_DETAIL_PANE_CLASS], context: null, meta: null }, [
            paragraph({
                classes: [DR_EMPTY_CLASS],
                text: "Select a row to view.",
                context: null,
                meta: null,
            }),
        ]);
    }
    const secrets = new Set(state.info.secretColumns);
    const cols = Object.keys(state.row);
    const fields = cols.map((c) => buildField(state.table, c, state.row![c], state.row!, secrets));
    const bodyChildren: Instance[] = [];
    if (state.info.excludedColumns.length > 0) bodyChildren.push(buildSecurityNote(state.info.excludedColumns));
    bodyChildren.push(...fields);
    const body = div({ classes: [DR_DETAIL_BODY_CLASS], context: null, meta: null }, bodyChildren);
    return div({ classes: [GLASS_PANE_INNER_CLASS, DR_DETAIL_PANE_CLASS], context: null, meta: null }, [
        buildHeader(state, handlers),
        body,
    ]);
}
