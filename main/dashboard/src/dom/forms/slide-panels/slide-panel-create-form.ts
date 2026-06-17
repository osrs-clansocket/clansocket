import {
    BTN_VARIANT_BARE,
    button,
    derived,
    div,
    paragraph,
    signal,
    slidePanel,
    wireSubmit,
    type Instance,
    type SlidePanelInstance,
} from "../../factory";
import { form as formEl } from "../../factory/content-ops/form/form-textarea.js";
import { FORM_CLAIM_FORM, FORM_ERROR } from "../form-classes.js";

const TOOLBAR_BTN_CLASS = "clans-manage__discord-toolbar-btn";
const PANEL_ACTION_BTN_CLASS = TOOLBAR_BTN_CLASS;
const FOOTER_HOST_CLASS = "slide-panel__footer";

const DEFAULT_CANCEL_LABEL = "Cancel";

export interface SlidePanelCreateFormOptions {
    triggerLabel: string;
    triggerContext: string;
    submitLabel: string;
    submitContext: string;
    cancelLabel?: string;
    buildFields: () => readonly Instance[];
    onSubmit: () => Promise<string | undefined>;
    onPanelOpen?: (inst: SlidePanelInstance) => void;
    onPanelClose?: () => void;
}

export function buildSlidePanelCreateForm(opts: SlidePanelCreateFormOptions): SlidePanelInstance {
    const panelHost = div({ classes: [], context: null, meta: null });
    const footerHost = div({ classes: [FOOTER_HOST_CLASS], context: null, meta: null });
    footerHost.el.hidden = true;
    let panelInst: SlidePanelInstance | null = null;

    function renderForm(): void {
        const errorSig = signal<string>("");
        const errorEl = paragraph({
            classes: [FORM_ERROR],
            text: derived(() => errorSig()),
            hidden: "",
            context: null,
            meta: null,
        });

        const cancelBtn = button({
            classes: [PANEL_ACTION_BTN_CLASS],
            variant: BTN_VARIANT_BARE,
            text: opts.cancelLabel ?? DEFAULT_CANCEL_LABEL,
            context: "cancel the form and close the slide-panel",
            meta: ["action"],
            onClick: () => panelInst?.close(),
        });
        const submitBtn = button({
            classes: [PANEL_ACTION_BTN_CLASS],
            variant: BTN_VARIANT_BARE,
            type: "button",
            text: opts.submitLabel,
            context: opts.submitContext,
            meta: ["submit"],
        });

        const fields = opts.buildFields();

        const formNode = formEl({ classes: [FORM_CLAIM_FORM], context: null, meta: null }, [...fields, errorEl]);

        wireSubmit(formNode.el as HTMLFormElement, (e) => {
            e.preventDefault();
            submitBtn.el.disabled = true;
            void opts
                .onSubmit()
                .then((error) => {
                    if (error === undefined) {
                        panelInst?.close();
                        return;
                    }
                    errorSig.set(error);
                    errorEl.el.hidden = false;
                })
                .finally(() => {
                    submitBtn.el.disabled = false;
                });
        });

        submitBtn.el.addEventListener("click", () => {
            (formNode.el as HTMLFormElement).requestSubmit();
        });

        panelHost.setChildren(formNode);
        footerHost.setChildren(submitBtn, cancelBtn);
        footerHost.el.hidden = false;
    }

    const trigger = button({
        classes: [TOOLBAR_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: opts.triggerLabel,
        context: opts.triggerContext,
        meta: ["action"],
    });

    panelInst = slidePanel(
        {
            onOpen: () => {
                renderForm();
                if (panelInst !== null) opts.onPanelOpen?.(panelInst);
            },
            onClose: () => {
                panelHost.clear();
                footerHost.clear();
                footerHost.el.hidden = true;
                opts.onPanelClose?.();
            },
            context: null,
            meta: null,
        },
        trigger,
        panelHost,
    );
    panelInst.addChild(footerHost);

    return panelInst;
}
