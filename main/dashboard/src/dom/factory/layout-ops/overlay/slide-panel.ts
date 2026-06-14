import { div } from "../structural/container.js";
import type { ContextProps, Instance } from "../../core/index.js";

const ROOT_CLASS = "slide-panel";
const PANEL_CLASS = "slide-panel__panel";
const PANEL_OPEN_CLASS = "slide-panel__panel--open";
const EVT_CLICK = "click";
const ATTR_EXPANDED = "aria-expanded";

interface SlidePanelProps extends ContextProps {
    rootClasses?: readonly string[];
    panelClasses?: readonly string[];
    onOpen?: () => void;
    onClose?: () => void;
}

interface SlidePanelInstance extends Instance {
    open(): void;
    close(): void;
    toggle(): void;
    isOpen(): boolean;
    readonly triggerEl: HTMLElement;
    readonly panelEl: HTMLElement;
}

function slidePanel(props: SlidePanelProps, trigger: Instance, panel: Instance): SlidePanelInstance {
    panel.el.classList.add(PANEL_CLASS);
    if (props.panelClasses) {
        for (const c of props.panelClasses) panel.el.classList.add(c);
    }

    const rootClasses = [ROOT_CLASS, ...(props.rootClasses ?? [])];
    const root = div({ classes: rootClasses, context: props.context, meta: props.meta }, [trigger, panel]);

    let opened = false;
    trigger.el.setAttribute(ATTR_EXPANDED, "false");

    const inst: SlidePanelInstance = Object.assign(root, {
        triggerEl: trigger.el,
        panelEl: panel.el,
        isOpen: () => opened,
        open: () => {
            if (opened) return;
            opened = true;
            panel.el.classList.add(PANEL_OPEN_CLASS);
            trigger.el.setAttribute(ATTR_EXPANDED, "true");
            props.onOpen?.();
        },
        close: () => {
            if (!opened) return;
            opened = false;
            panel.el.classList.remove(PANEL_OPEN_CLASS);
            trigger.el.setAttribute(ATTR_EXPANDED, "false");
            props.onClose?.();
        },
        toggle: () => {
            if (opened) inst.close();
            else inst.open();
        },
    });

    trigger.el.addEventListener(EVT_CLICK, () => {
        inst.toggle();
    });

    return inst;
}

export { slidePanel };
export type { SlidePanelProps, SlidePanelInstance };
