import {
    BTN_VARIANT_OUTLINE,
    button,
    createInstance,
    div,
    input,
    paragraph,
    type Instance,
} from "../../../../factory/index.js";
import { ACCOUNT_EMPTY_CLASS } from "../../../../../shared/constants/account-constants.js";
import {
    identityClient,
    RSN_MAX_LEN,
    type Identification,
} from "../../../../../state/identity/identity-client/index.js";
import { setStatus } from "./formatting.js";
import { buildDisplacedBanner, buildPendingRow, buildVerifiedRow } from "./rows.js";
import { FORM_FORM_ROW, FORM_INPUT } from "../../../../forms/form-classes.js";

export interface RsnListRenderer {
    render: (data: Identification | null) => void;
}

export function createRsnListRenderer(host: Instance, refresh: () => void, status: Instance): RsnListRenderer {
    const rowPool = new Map<string, Instance>();
    let bannerInst: Instance | null = null;
    let emptyInst: Instance | null = null;
    let failedInst: Instance | null = null;

    function clearPool(): void {
        for (const inst of rowPool.values()) inst.destroy();
        rowPool.clear();
        if (bannerInst !== null) {
            bannerInst.destroy();
            bannerInst = null;
        }
    }

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

    function render(data: Identification | null): void {
        if (data === null) {
            clearPool();
            if (emptyInst !== null) {
                emptyInst.destroy();
                emptyInst = null;
            }
            if (failedInst === null) {
                failedInst = paragraph({
                    classes: [ACCOUNT_EMPTY_CLASS],
                    text: "Failed to load.",
                    context: null,
                    meta: null,
                });
            }
            placeChildren([failedInst]);
            return;
        }
        if (failedInst !== null) {
            failedInst.destroy();
            failedInst = null;
        }
        const isEmpty = data.verifiedRsns.length === 0 && data.pendingRequests.length === 0;
        const live = new Set<string>();
        for (const r of data.verifiedRsns) {
            const key = `verified:${r.rsn}`;
            live.add(key);
            if (!rowPool.has(key)) rowPool.set(key, buildVerifiedRow(r, refresh, status));
        }
        for (const req of data.pendingRequests) {
            const key = `pending:${req.id}`;
            live.add(key);
            if (!rowPool.has(key)) rowPool.set(key, buildPendingRow(req, refresh, status));
        }
        for (const [key, inst] of rowPool) {
            if (!live.has(key)) {
                inst.destroy();
                rowPool.delete(key);
            }
        }
        const showDisplaced = data.verifiedRsns.some((r) => r.displaced);
        if (showDisplaced) {
            if (bannerInst !== null) {
                bannerInst.destroy();
                bannerInst = null;
            }
            bannerInst = buildDisplacedBanner(data.verifiedRsns);
        } else if (bannerInst !== null) {
            bannerInst.destroy();
            bannerInst = null;
        }
        if (isEmpty) {
            if (emptyInst === null) {
                emptyInst = paragraph({
                    classes: [ACCOUNT_EMPTY_CLASS],
                    text: "No verified rsns yet.",
                    context: null,
                    meta: null,
                });
            }
        } else if (emptyInst !== null) {
            emptyInst.destroy();
            emptyInst = null;
        }
        const children: Instance[] = [];
        if (bannerInst !== null) children.push(bannerInst);
        if (emptyInst !== null) children.push(emptyInst);
        for (const r of data.verifiedRsns) {
            const inst = rowPool.get(`verified:${r.rsn}`);
            if (inst !== undefined) children.push(inst);
        }
        for (const req of data.pendingRequests) {
            const inst = rowPool.get(`pending:${req.id}`);
            if (inst !== undefined) children.push(inst);
        }
        placeChildren(children);
    }

    return { render };
}

export function buildClaimForm(refresh: () => void, status: Instance): Instance {
    const rsnInput = input({
        classes: [FORM_INPUT],
        type: "text",
        maxlength: String(RSN_MAX_LEN),
        placeholder: "RSN to claim",
        autocomplete: "off",
        ariaLabel: "RSN to claim",
        context: "enter an RSN to claim and verify",
        meta: ["input", "rsn"],
    });
    return div({ classes: [FORM_FORM_ROW], context: null, meta: null }, [
        rsnInput,
        button({
            variant: BTN_VARIANT_OUTLINE,
            compact: true,
            text: "Verify",
            context: "verify and claim this RSN",
            meta: ["action", "rsn"],
            onClick: async () => {
                const value = rsnInput.el.value.trim();
                if (value.length === 0) {
                    setStatus(status, "RSN required.");
                    return;
                }
                const result = await identityClient.requestRsn(value);
                if (result.ok) {
                    setStatus(
                        status,
                        "Queued. Log into OSRS via RuneLite with the ClanSocket plugin enabled to confirm.",
                    );
                    rsnInput.el.value = "";
                    refresh();
                } else {
                    setStatus(status, result.message ?? `failed: ${result.error}`);
                }
            },
        }),
    ]);
}
