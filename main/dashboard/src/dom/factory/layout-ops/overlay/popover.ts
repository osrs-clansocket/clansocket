import { div } from "../structural/container.js";
import { applyEffects } from "../../effect-helpers.js";
import type { ContextProps, Instance } from "../../core/index.js";

const EVT_CLICK = "click";
const EVT_KEYDOWN = "keydown";
const KEY_ESCAPE = "Escape";
const ATTR_EXPANDED = "aria-expanded";

interface PopoverProps extends ContextProps {
    openClass: string;
    rootClasses?: readonly string[];
    rootAttrs?: Record<string, string>;
    onOpen?: () => void;
    onClose?: () => void;
}

interface PopoverInstance extends Instance {
    open(): void;
    close(): void;
    toggle(): void;
    isOpen(): boolean;
    readonly triggerEl: HTMLElement;
    readonly popupEl: HTMLElement;
}

const openPopovers = new Set<PopoverInstance>();
let globalWired = false;

function closeAll(): void {
    for (const p of [...openPopovers]) p.close();
}

function ensureGlobalListeners(): void {
    if (globalWired) return;
    globalWired = true;
    document.addEventListener(EVT_CLICK, () => closeAll());
    document.addEventListener(EVT_KEYDOWN, (e) => {
        if (e.key === KEY_ESCAPE) closeAll();
    });
}

function popover(props: PopoverProps, trigger: Instance, popup: Instance): PopoverInstance {
    ensureGlobalListeners();
    const root = div(
        { classes: props.rootClasses ?? [], attrs: props.rootAttrs, context: props.context, meta: props.meta },
        [trigger, popup],
    );
    let opened = false;
    trigger.el.setAttribute(ATTR_EXPANDED, "false");
    const inst: PopoverInstance = Object.assign(root, {
        triggerEl: trigger.el,
        popupEl: popup.el,
        isOpen: () => opened,
        open: () => {
            if (opened) return;
            closeAll();
            opened = true;
            root.el.classList.add(props.openClass);
            applyEffects(popup.el, { name: "drop", once: true });
            trigger.el.setAttribute(ATTR_EXPANDED, "true");
            openPopovers.add(inst);
            props.onOpen?.();
        },
        close: () => {
            if (!opened) return;
            opened = false;
            root.el.classList.remove(props.openClass);
            trigger.el.setAttribute(ATTR_EXPANDED, "false");
            openPopovers.delete(inst);
            props.onClose?.();
        },
        toggle: () => {
            if (opened) inst.close();
            else inst.open();
        },
    });
    trigger.el.addEventListener(EVT_CLICK, (e) => {
        e.stopPropagation();
        inst.toggle();
    });
    popup.el.addEventListener(EVT_CLICK, (e) => {
        e.stopPropagation();
    });
    return inst;
}

export { popover };
export type { PopoverProps, PopoverInstance };
