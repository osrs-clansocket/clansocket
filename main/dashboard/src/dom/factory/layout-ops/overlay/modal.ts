import { div } from "../structural/container.js";
import type { Child, ContextProps, Instance } from "../../core/index.js";
import { onceEffect } from "../../effect-helpers.js";

const OPEN_DELAY_MS = 10;
const CLOSE_DELAY_MS = 200;
const EVT_CLICK = "click";
const EVT_KEYDOWN = "keydown";
const KEY_ESCAPE = "Escape";

interface ModalProps extends ContextProps {
    openClass: string;
    overlayClasses?: readonly string[];
    dialogClasses?: readonly string[];
    onClose?: () => void;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    initialFocus?: () => HTMLElement | null;
    restoreFocus?: boolean;
}

interface ModalInstance extends Instance {
    open(): void;
    dismiss(): void;
    readonly dialogEl: HTMLElement;
}

function modal(props: ModalProps, children: readonly Child[] = []): ModalInstance {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreFocus = props.restoreFocus !== false;
    const closeOnBackdrop = props.closeOnBackdrop !== false;
    const closeOnEscape = props.closeOnEscape !== false;

    const dialog = div({ classes: props.dialogClasses ?? [], effects: onceEffect("pop") }, children);
    dialog.el.addEventListener(EVT_CLICK, (e) => e.stopPropagation());

    const overlay = div({ classes: props.overlayClasses ?? [], context: props.context, meta: props.meta }, [dialog]);

    let dismissed = false;

    const dismiss = (): void => {
        if (dismissed) return;
        dismissed = true;
        overlay.el.classList.remove(props.openClass);
        document.removeEventListener(EVT_KEYDOWN, onKey);
        window.setTimeout(() => {
            overlay.destroy();
            if (restoreFocus && previousFocus !== null) previousFocus.focus();
        }, CLOSE_DELAY_MS);
    };

    const onKey = (e: KeyboardEvent): void => {
        if (closeOnEscape && e.key === KEY_ESCAPE) {
            e.preventDefault();
            props.onClose?.();
            dismiss();
        }
    };

    if (closeOnBackdrop) {
        overlay.el.addEventListener(EVT_CLICK, (e) => {
            if (e.target !== overlay.el) return;
            props.onClose?.();
            dismiss();
        });
    }

    const open = (): void => {
        document.addEventListener(EVT_KEYDOWN, onKey);
        window.setTimeout(() => {
            overlay.el.classList.add(props.openClass);
            const target = props.initialFocus?.() ?? null;
            if (target !== null) target.focus();
        }, OPEN_DELAY_MS);
    };

    return Object.assign(overlay, { open, dismiss, dialogEl: dialog.el });
}

export { modal };
export type { ModalProps, ModalInstance };
