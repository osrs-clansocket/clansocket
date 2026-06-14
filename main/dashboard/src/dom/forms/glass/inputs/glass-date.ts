import { button, createInstance, div, icon, input, popover, span, type Instance } from "../../../factory/index.js";
import {
    GD_DAY,
    GD_LABEL,
    GD_NAV_BTN,
    GD_OPEN,
    GD_POPUP,
    GD_ROOT,
    GD_TRIGGER,
    ATTR_DATE,
    ATTR_NAV_DIR,
    buildPopupContents,
    isoDate,
    parseIso,
} from "./glass-date-build.js";
import { GLASS_DATE_ICON_CLASS } from "../../../../shared/constants/glass-constants.js";

const EVT_CLICK = "click";

export interface GlassDateProps {
    name?: string;
    value?: string;
    placeholder?: string;
    onChange?: (iso: string) => void;
}

interface DateState {
    view: Date;
    selected: string;
    placeholder: string;
}

export function glassDate(props: GlassDateProps = {}): Instance {
    const name = props.name ?? "";
    const initialValue = props.value ?? "";
    const placeholder = props.placeholder ?? "pick a date";
    const state: DateState = {
        view: parseIso(initialValue) ?? new Date(),
        selected: initialValue,
        placeholder,
    };
    const initialLabel = initialValue.length > 0 ? initialValue : placeholder;
    const labelInst = span({ classes: [GD_LABEL], text: initialLabel, context: null, meta: null });
    const trigger = button(
        {
            ariaLabel: "Pick a date",
            classes: [GD_TRIGGER],
            type: "button",
            ariaHaspopup: "dialog",
            context: "open the date picker",
            meta: ["action", "input"],
        },
        [labelInst, icon({ name: "calendar-event", classes: [GLASS_DATE_ICON_CLASS], context: null, meta: null })],
    );
    const hidden = input({
        ariaLabel: "Date value",
        name,
        type: "hidden",
        value: initialValue,
        context: "the selected date (hidden field)",
        meta: ["input"],
    });
    const popup = div({ classes: [GD_POPUP], role: "dialog", context: null, meta: null });

    const renderPopup = (): void => {
        createInstance(popup.el).setChildren(buildPopupContents(state.view, state.selected));
    };
    renderPopup();

    const setValue = (iso: string): void => {
        state.selected = iso;
        hidden.el.value = iso;
        hidden.el.dispatchEvent(new Event("change", { bubbles: true }));
        labelInst.setText(iso.length > 0 ? iso : state.placeholder);
        props.onChange?.(iso);
    };

    popup.el.addEventListener(EVT_CLICK, (e) => {
        const target = e.target as HTMLElement;
        const navBtn = target.closest<HTMLElement>(`.${GD_NAV_BTN}`);
        if (navBtn) {
            const dir = Number(navBtn.getAttribute(ATTR_NAV_DIR) ?? "0");
            state.view = new Date(Date.UTC(state.view.getUTCFullYear(), state.view.getUTCMonth() + dir, 1));
            renderPopup();
            return;
        }
        const dayBtn = target.closest<HTMLElement>(`.${GD_DAY}`);
        if (dayBtn) {
            const iso = dayBtn.getAttribute(ATTR_DATE) ?? "";
            setValue(iso);
            inst.close();
        }
    });

    const inst = popover(
        {
            openClass: GD_OPEN,
            rootClasses: [GD_ROOT],
            rootAttrs: { "data-glass-date": "" },
            context: null,
            meta: null,
        },
        trigger,
        popup,
    );
    inst.addChild(hidden);
    return inst;
}

export { isoDate, parseIso };
