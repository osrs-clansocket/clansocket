import { div } from "../structural/container.js";
import type { ContextProps, Instance } from "../../core/index.js";

const ROOT_CLASS = "slide-panel";
const ROOT_BANNER_CLASS = "slide-panel--banner";
const PANEL_CLASS = "slide-panel__panel";
const PANEL_OPEN_CLASS = "slide-panel__panel--open";
const EVT_CLICK = "click";
const ATTR_EXPANDED = "aria-expanded";
const ATTR_ALIGN = "data-slide-panel-align";
const ATTR_HOST = "data-slide-panel-host";
const ALIGN_START = "start";
const ALIGN_CENTER = "center";
const ALIGN_END = "end";

const ALIGN_THIRD = 1 / 3;
const ALIGN_TWO_THIRDS = 2 / 3;

interface SlidePanelProps extends ContextProps {
    rootClasses?: readonly string[];
    panelClasses?: readonly string[];
    onOpen?: () => void;
    onClose?: () => void;
    // When true, the panel mounts at the trigger's nearest component ancestor
    // on open as a full-width banner (between the trigger's row and the rows
    // below it within the component). Content alignment derives from trigger
    // x-position via data-slide-panel-align. When false (default), legacy
    // behavior — panel stays as sibling of trigger inside the slide-panel
    // root, growing inline. existing consumers (forms, pickers, BYO confirms)
    // rely on the inline behavior; opt-in to bannerMode for the page-split UX.
    bannerMode?: boolean;
}

interface SlidePanelInstance extends Instance {
    open(): void;
    close(): void;
    toggle(): void;
    isOpen(): boolean;
    readonly triggerEl: HTMLElement;
    readonly panelEl: HTMLElement;
}

// The component for a trigger is the slide-panel root's immediate parent —
// the container the slide-panel was mounted into (toolbar, section, header,
// row, panel body, etc.). The banner mounts there so it spans that
// container's full width, sliding in right after the slide-panel's row.
//
// Override: if any ancestor walks above the immediate parent carries
// data-slide-panel-host="true", use that instead. handles deeper-nested
// cases where the natural component is a few levels up.
function findComponent(rootEl: HTMLElement): HTMLElement | null {
    const immediate = rootEl.parentElement;
    if (immediate === null) return null;
    let cur: HTMLElement | null = immediate;
    while (cur !== null) {
        if (cur.getAttribute(ATTR_HOST) === "true") return cur;
        cur = cur.parentElement;
    }
    return immediate;
}

function alignmentFor(triggerEl: HTMLElement, component: HTMLElement): string {
    const tr = triggerEl.getBoundingClientRect();
    const cr = component.getBoundingClientRect();
    if (cr.width === 0) return ALIGN_CENTER;
    const center = tr.left + tr.width / 2;
    const relative = (center - cr.left) / cr.width;
    if (relative < ALIGN_THIRD) return ALIGN_START;
    if (relative > ALIGN_TWO_THIRDS) return ALIGN_END;
    return ALIGN_CENTER;
}

function slidePanel(props: SlidePanelProps, trigger: Instance, panel: Instance): SlidePanelInstance {
    panel.el.classList.add(PANEL_CLASS);
    if (props.panelClasses) {
        for (const c of props.panelClasses) panel.el.classList.add(c);
    }

    const bannerMode = props.bannerMode === true;
    const baseClasses = [ROOT_CLASS, ...(props.rootClasses ?? [])];
    if (bannerMode) baseClasses.push(ROOT_BANNER_CLASS);

    // In legacy mode the root wraps trigger + panel as siblings — panel
    // expands inline below the trigger. In banner mode the root wraps only
    // the trigger; the panel mounts at the trigger's component ancestor on
    // open and remains parented there across subsequent toggles.
    const root = bannerMode
        ? div({ classes: baseClasses, context: props.context, meta: props.meta }, [trigger])
        : div({ classes: baseClasses, context: props.context, meta: props.meta }, [trigger, panel]);

    let opened = false;
    trigger.el.setAttribute(ATTR_EXPANDED, "false");

    function ensurePanelAtComponent(): void {
        const component = findComponent(root.el);
        if (component === null) {
            // Root not mounted yet — fall back to root.appendChild so the
            // panel still appears (legacy in-flow behavior).
            if (panel.el.parentElement !== root.el) root.el.appendChild(panel.el);
            return;
        }
        // Walk up from root until we find the direct child of component.
        // Handles the case where data-slide-panel-host="true" is set on an
        // ancestor more than one level above the trigger's slide-panel root.
        let branch: HTMLElement = root.el;
        while (branch.parentElement !== null && branch.parentElement !== component) {
            branch = branch.parentElement;
        }
        if (branch.parentElement !== component) {
            // Root is not a descendant of component — fall back to in-flow.
            if (panel.el.parentElement !== root.el) root.el.appendChild(panel.el);
            return;
        }
        const after = branch.nextSibling;
        const alreadyPlaced = panel.el.parentElement === component && panel.el.previousSibling === branch;
        if (!alreadyPlaced) {
            if (after !== null) component.insertBefore(panel.el, after);
            else component.appendChild(panel.el);
        }
        panel.el.setAttribute(ATTR_ALIGN, alignmentFor(trigger.el, component));
    }

    const inst: SlidePanelInstance = Object.assign(root, {
        triggerEl: trigger.el,
        panelEl: panel.el,
        isOpen: () => opened,
        open: () => {
            if (opened) return;
            opened = true;
            if (bannerMode) ensurePanelAtComponent();
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
