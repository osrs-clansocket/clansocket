import { createInstance, div, effect, heading, paragraph, type Instance } from "../../../factory";
import { consentsStore } from "../../../../state/identity/stores/consents-store.js";
import type { ConsentRecord } from "../../../../state/identity/consent/consent-client.js";
import { buildPendingRow, buildResolvedRow } from "./rows.js";
import { FORM_HINT } from "../../../forms/form-classes.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
} from "../../../../shared/constants/account-constants.js";

const FOOTER_HINT = "Cancel anything pending here. Older requests stay listed as ur record.";

interface ConsentsRenderer {
    render: (rows: ConsentRecord[]) => void;
}

function createConsentsRenderer(host: Instance, refresh: () => void, status: Instance): ConsentsRenderer {
    const rowPool = new Map<string, Instance>();
    let emptyInst: Instance | null = null;

    function placeChildren(children: readonly Instance[]): void {
        let nextEl: ChildNode | null = host.el.firstChild;
        for (const child of children) {
            if (child.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
            else host.addBefore(child, nextEl);
        }
        while (nextEl !== null) {
            const drop = nextEl;
            nextEl = nextEl.nextSibling;
            createInstance(drop as HTMLElement).detach();
        }
    }

    function render(rows: ConsentRecord[]): void {
        if (rows.length === 0) {
            for (const inst of rowPool.values()) inst.destroy();
            rowPool.clear();
            if (emptyInst === null) {
                emptyInst = paragraph({
                    classes: [ACCOUNT_EMPTY_CLASS],
                    text: "No consent records yet.",
                    context: null,
                    meta: null,
                });
            }
            placeChildren([emptyInst]);
            return;
        }
        if (emptyInst !== null) {
            emptyInst.destroy();
            emptyInst = null;
        }
        const live = new Set<string>();
        for (const r of rows) {
            const key = String(r.id);
            live.add(key);
            if (!rowPool.has(key)) {
                rowPool.set(key, r.status === "pending" ? buildPendingRow(r, refresh, status) : buildResolvedRow(r));
            }
        }
        for (const [key, inst] of rowPool) {
            if (!live.has(key)) {
                inst.destroy();
                rowPool.delete(key);
            }
        }
        const ordered: Instance[] = [];
        for (const r of rows) {
            const inst = rowPool.get(String(r.id));
            if (inst !== undefined) ordered.push(inst);
        }
        placeChildren(ordered);
    }

    return { render };
}

export function buildConsentPanel(): HTMLElement {
    const status = paragraph({ classes: [FORM_HINT], text: "", context: null, meta: null });
    status.el.hidden = true;
    const host = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    const root = div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Requests", context: null, meta: null }),
        div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null }, [host, status]),
        div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null }, [
            paragraph({ classes: [FORM_HINT], text: FOOTER_HINT, context: null, meta: null }),
        ]),
    ]);
    const renderer = createConsentsRenderer(host, () => void consentsStore.refresh(), status);
    root.trackDispose(effect(() => renderer.render(consentsStore.list$())));
    return root.el;
}
