import { BTN_VARIANT_OUTLINE, button, createInstance, div, icon, span } from "../../../factory";
import { FIELD_LABEL_CLASS, HEADER_ROW_CLASS, ICON_BTN_CLASS } from "./state.js";

export function iconBtn(name: string, label: string, onClick: () => void): ReturnType<typeof button> {
    return button(
        {
            classes: [ICON_BTN_CLASS],
            ariaLabel: label,
            title: label,
            context: label,
            meta: ["action"],
            onClick,
        },
        [icon({ name, context: null, meta: null }).el],
    );
}

export function renderSectionHeader(host: HTMLElement, title: string, addLabel: string, onAdd: () => void): void {
    const hdr = div({ classes: [HEADER_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [FIELD_LABEL_CLASS], text: title, context: null, meta: null }),
        button({
            variant: BTN_VARIANT_OUTLINE,
            compact: true,
            text: addLabel,
            ariaLabel: addLabel,
            context: addLabel,
            meta: ["action"],
            onClick: onAdd,
        }),
    ]);
    createInstance(host).addChild(hdr);
}
