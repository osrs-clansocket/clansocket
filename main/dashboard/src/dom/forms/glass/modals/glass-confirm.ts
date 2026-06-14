import { button, createInstance, div, heading, modal, paragraph } from "../../../factory/index.js";
import { isEnter } from "../../keys.js";

const CLASS_OVERLAY = "glass-confirm__overlay";
const CLASS_DIALOG = "glass-confirm";
const CLASS_OPEN = "glass-confirm--open";
const CLASS_TITLE = "glass-confirm__title";
const CLASS_MESSAGE = "glass-confirm__message";
const CLASS_ACTIONS = "glass-confirm__actions";
const CLASS_BTN = "glass-confirm__btn";
const CLASS_BTN_CANCEL = "glass-confirm__btn--cancel";
const CLASS_BTN_CONFIRM = "glass-confirm__btn--confirm";
const CLASS_BTN_DANGER = "glass-confirm__btn--danger";
const CLOSE_RESOLVE_DELAY_MS = 220;

interface ConfirmOptions {
    title?: string;
    message: string;
    cancelLabel?: string;
    confirmLabel?: string;
    danger?: boolean;
}

function glassConfirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const title = options.title ?? "Confirm";
        const message = options.message;
        const cancelLabel = options.cancelLabel ?? "Cancel";
        const confirmLabel = options.confirmLabel ?? "Confirm";
        const danger = Boolean(options.danger);
        let settled = false;
        const settle = (result: boolean): void => {
            if (settled) return;
            settled = true;
            m.dismiss();
            window.setTimeout(() => resolve(result), CLOSE_RESOLVE_DELAY_MS);
        };
        const confirmClasses = danger
            ? [CLASS_BTN, CLASS_BTN_CONFIRM, CLASS_BTN_DANGER]
            : [CLASS_BTN, CLASS_BTN_CONFIRM];
        const cancelBtn = button({
            classes: [CLASS_BTN, CLASS_BTN_CANCEL],
            text: cancelLabel,
            context: "cancel and dismiss the dialog",
            meta: ["action"],
            onClick: () => settle(false),
        });
        const confirmBtn = button({
            classes: confirmClasses,
            text: confirmLabel,
            context: "confirm the action",
            meta: danger ? ["destructive"] : ["submit"],
            onClick: () => settle(true),
        });
        const actions = div({ classes: [CLASS_ACTIONS], context: null, meta: null }, [cancelBtn, confirmBtn]);
        const titleEl = heading("h2", {
            classes: [CLASS_TITLE],
            text: title,
            id: "glass-confirm-title",
            context: null,
            meta: null,
        });
        const msgEl = paragraph({
            classes: [CLASS_MESSAGE],
            text: message,
            id: "glass-confirm-msg",
            context: null,
            meta: null,
        });
        const m = modal(
            {
                overlayClasses: [CLASS_OVERLAY],
                dialogClasses: [CLASS_DIALOG],
                openClass: CLASS_OPEN,
                context: null,
                meta: null,
                onClose: () => settle(false),
                initialFocus: () => cancelBtn.el,
            },
            [titleEl, msgEl, actions],
        );
        const dialogInst = createInstance(m.dialogEl);
        dialogInst.setAttr("role", "alertdialog");
        dialogInst.setAttr("aria-modal", "true");
        dialogInst.setAttr("aria-labelledby", "glass-confirm-title");
        dialogInst.setAttr("aria-describedby", "glass-confirm-msg");
        m.dialogEl.addEventListener("keydown", (e) => {
            if (isEnter(e) && document.activeElement === confirmBtn.el) {
                e.preventDefault();
                settle(true);
            }
        });
        createInstance(document.body).addChild(m);
        m.open();
    });
}

export { glassConfirm };
export type { ConfirmOptions };
