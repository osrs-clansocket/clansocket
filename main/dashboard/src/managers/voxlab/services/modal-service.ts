import { button, div, input, type Instance } from "../../../dom/factory/index.js";
import {
    MODAL_CARD_BODY_CLASS,
    MODAL_CARD_BTN_CLASS,
    MODAL_CARD_BTN_DANGER_MOD,
    MODAL_CARD_BTN_PRIMARY_MOD,
    MODAL_CARD_BTN_SECONDARY_MOD,
    MODAL_CARD_BUTTONS_CLASS,
    MODAL_CARD_CLASS,
    MODAL_CARD_INPUT_CLASS,
    MODAL_CARD_TITLE_CLASS,
    MODAL_OVERLAY_CLASS,
    MODAL_ROOT_CLASS,
} from "../../../shared/constants/voxlab/voxlab-classes-constants.js";

type ModalRole = "primary" | "secondary" | "danger";

interface ModalButton {
    label: string;
    role: ModalRole;
    value: string | boolean | null;
}

interface ModalSpec {
    title: string;
    body?: string;
    input?: { defaultValue: string };
    buttons: ModalButton[];
}

type ModalResolve = (value: string | boolean | null) => void;

const ROLE_MOD: Record<ModalRole, string> = {
    primary: MODAL_CARD_BTN_PRIMARY_MOD,
    secondary: MODAL_CARD_BTN_SECONDARY_MOD,
    danger: MODAL_CARD_BTN_DANGER_MOD,
};

export class ModalService {
    private rootInstance: Instance | null = null;

    alert(message: string): Promise<void> {
        return this.open({
            title: "Notice",
            body: message,
            buttons: [{ label: "OK", role: "primary", value: true }],
        }).then(() => undefined);
    }

    confirm(
        message: string,
        options?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean },
    ): Promise<boolean> {
        return this.open({
            title: "Confirm",
            body: message,
            buttons: [
                { label: options?.cancelLabel ?? "Cancel", role: "secondary", value: false },
                {
                    label: options?.confirmLabel ?? "Confirm",
                    role: options?.danger ? "danger" : "primary",
                    value: true,
                },
            ],
        }).then((v) => v === true);
    }

    prompt(message: string, defaultValue = ""): Promise<string | null> {
        return this.open({
            title: "Input",
            body: message,
            input: { defaultValue },
            buttons: [
                { label: "Cancel", role: "secondary", value: null },
                { label: "OK", role: "primary", value: "" },
            ],
        }).then((v) => (v === null || v === false ? null : String(v)));
    }

    private getRoot(): Instance {
        if (!this.rootInstance) {
            this.rootInstance = div({
                classes: [MODAL_ROOT_CLASS],
                context: null,
                meta: null,
            });
            this.rootInstance.mount(document.body);
        }
        return this.rootInstance;
    }

    private open(spec: ModalSpec): Promise<string | boolean | null> {
        const root = this.getRoot();
        return new Promise((resolve) => {
            const inputInstance = spec.input ? this.buildInput(spec.input.defaultValue) : null;
            const overlay = this.buildOverlay(spec, inputInstance, resolve);
            root.addChild(overlay.el);
            if (inputInstance) {
                inputInstance.el.focus();
                inputInstance.el.select();
            } else {
                overlay.el.focus();
            }
        });
    }

    private buildOverlay(
        spec: ModalSpec,
        inputInstance: Instance<HTMLInputElement> | null,
        resolve: ModalResolve,
    ): Instance {
        const card = this.buildCard(spec, inputInstance, (value) => {
            overlay.detach();
            resolve(value);
        });
        const overlay = div(
            {
                classes: [MODAL_OVERLAY_CLASS],
                tabindex: "-1",
                context: "voxlab modal overlay — click outside to dismiss, esc/enter to resolve",
                meta: ["modal"],
                onClick: (e) => {
                    if (e.target === overlay.el) {
                        overlay.detach();
                        resolve(spec.input ? null : false);
                    }
                },
                onKeydown: (e) => {
                    if (e.key === "Escape") {
                        overlay.detach();
                        resolve(spec.input ? null : false);
                    } else if (e.key === "Enter") {
                        overlay.detach();
                        if (inputInstance) {
                            resolve(inputInstance.el.value);
                        } else {
                            resolve(spec.buttons[spec.buttons.length - 1].value);
                        }
                    }
                },
            },
            [card.el],
        );
        return overlay;
    }

    private buildCard(
        spec: ModalSpec,
        inputInstance: Instance<HTMLInputElement> | null,
        cleanup: ModalResolve,
    ): Instance {
        const children: HTMLElement[] = [];
        const title = div({
            classes: [MODAL_CARD_TITLE_CLASS],
            text: spec.title,
            context: null,
            meta: null,
        });
        children.push(title.el);
        if (spec.body) {
            const body = div({
                classes: [MODAL_CARD_BODY_CLASS],
                text: spec.body,
                context: null,
                meta: null,
            });
            children.push(body.el);
        }
        if (inputInstance) {
            children.push(inputInstance.el);
        }
        const buttonRow = this.buildButtonRow(spec, inputInstance, cleanup);
        children.push(buttonRow.el);
        return div({ classes: [MODAL_CARD_CLASS], context: null, meta: null }, children);
    }

    private buildButtonRow(
        spec: ModalSpec,
        inputInstance: Instance<HTMLInputElement> | null,
        cleanup: ModalResolve,
    ): Instance {
        const buttonEls: HTMLElement[] = [];
        for (const btn of spec.buttons) {
            const btnInst = button({
                classes: [MODAL_CARD_BTN_CLASS, ROLE_MOD[btn.role]],
                text: btn.label,
                type: "button",
                context: `voxlab modal button — ${btn.label.toLowerCase()}`,
                meta: ["action"],
                onClick: () => {
                    if (inputInstance && btn.value === "") {
                        cleanup(inputInstance.el.value);
                    } else {
                        cleanup(btn.value);
                    }
                },
            });
            buttonEls.push(btnInst.el);
        }
        return div({ classes: [MODAL_CARD_BUTTONS_CLASS], context: null, meta: null }, buttonEls);
    }

    private buildInput(defaultValue: string): Instance<HTMLInputElement> {
        return input({
            classes: [MODAL_CARD_INPUT_CLASS],
            type: "text",
            value: defaultValue,
            context: "voxlab modal text input — value resolves the prompt promise",
            meta: ["input"],
        });
    }
}

export const modalService = new ModalService();
