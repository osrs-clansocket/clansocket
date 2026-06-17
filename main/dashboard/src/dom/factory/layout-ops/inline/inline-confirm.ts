import { type Instance } from "../../core";
import { button, BTN_VARIANT_OUTLINE } from "../../content-ops/button.js";
import { icon } from "../../content-ops/graphics/media.js";
import { div } from "../structural/container.js";

const INLINE_CONFIRM_HOST_CLASS = "glass-inline-confirm-host";
const CLASS_PENDING = "glass-inline-confirm";
const CLASS_ACTIONS = "glass-inline-confirm__actions";
const CLASS_BTN_DANGER = "glass-inline-confirm__btn--danger";
const DEFAULT_CANCEL_LABEL = "Cancel";
const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_CANCEL_ICON = "x-lg";
const DEFAULT_CONFIRM_ICON = "check-lg";
const EVT_KEYDOWN = "keydown";
const EVT_SCROLL = "scroll";
const EVT_RESIZE = "resize";
const KEY_ESCAPE = "Escape";
const VISIBILITY_HIDDEN = "hidden";

const pendingHosts = new WeakMap<Instance, () => void>();

interface InlineConfirmOptions {
    cancelLabel?: string;
    confirmLabel?: string;
    cancelIcon?: string;
    confirmIcon?: string;
    danger?: boolean;
    cancelContext: string;
    confirmContext: string;
}

interface OverlayContext {
    host: Instance;
    trigger: HTMLElement;
    anchor: HTMLElement;
    prevVisibility: string;
    resolve: (v: boolean) => void;
}

function buildCancelBtn(opts: InlineConfirmOptions, settle: (v: boolean) => void): Instance {
    return button(
        {
            variant: BTN_VARIANT_OUTLINE,
            compact: true,
            ariaLabel: opts.cancelLabel ?? DEFAULT_CANCEL_LABEL,
            context: opts.cancelContext,
            meta: ["action"],
            onClick: () => settle(false),
        },
        [icon({ name: opts.cancelIcon ?? DEFAULT_CANCEL_ICON, context: null, meta: null })],
    );
}

function buildConfirmBtn(opts: InlineConfirmOptions, danger: boolean, settle: (v: boolean) => void): Instance {
    return button(
        {
            classes: danger ? [CLASS_BTN_DANGER] : [],
            variant: BTN_VARIANT_OUTLINE,
            compact: true,
            ariaLabel: opts.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
            context: opts.confirmContext,
            meta: danger ? ["destructive"] : ["submit"],
            onClick: () => settle(true),
        },
        [icon({ name: opts.confirmIcon ?? DEFAULT_CONFIRM_ICON, context: null, meta: null })],
    );
}

function buildActions(
    opts: InlineConfirmOptions,
    settle: (v: boolean) => void,
): { actions: Instance; confirmBtn: Instance } {
    const danger = Boolean(opts.danger);
    const cancelBtn = buildCancelBtn(opts, settle);
    const confirmBtn = buildConfirmBtn(opts, danger, settle);
    const actions = div({ classes: [CLASS_ACTIONS], context: null, meta: null }, [cancelBtn, confirmBtn]);
    return { actions, confirmBtn };
}

function positionOverlay(actionsEl: HTMLElement, trigger: HTMLElement, anchor: HTMLElement): void {
    const triggerRect = trigger.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    actionsEl.style.left = `${triggerRect.left - anchorRect.left - anchor.clientLeft + anchor.scrollLeft}px`;
    actionsEl.style.top = `${triggerRect.top - anchorRect.top - anchor.clientTop + anchor.scrollTop}px`;
    actionsEl.style.inlineSize = `${triggerRect.width}px`;
    actionsEl.style.blockSize = `${triggerRect.height}px`;
}

function findAnchor(trigger: HTMLElement): HTMLElement | null {
    const offsetParent = trigger.offsetParent;
    if (offsetParent instanceof HTMLElement) return offsetParent;
    return document.body;
}

function startOverlay(ctx: OverlayContext): {
    settle: (result: boolean) => void;
    bindActions: (a: Instance) => void;
} {
    let settled = false;
    let actionsRef: Instance | null = null;
    const reposition = (): void => {
        if (actionsRef !== null) positionOverlay(actionsRef.el, ctx.trigger, ctx.anchor);
    };
    const settle = (result: boolean): void => {
        if (settled) return;
        settled = true;
        pendingHosts.delete(ctx.host);
        document.removeEventListener(EVT_KEYDOWN, onKey);
        window.removeEventListener(EVT_SCROLL, reposition, true);
        window.removeEventListener(EVT_RESIZE, reposition);
        ctx.host.el.classList.remove(CLASS_PENDING);
        ctx.trigger.style.visibility = ctx.prevVisibility;
        if (actionsRef !== null) actionsRef.destroy();
        ctx.trigger.focus();
        ctx.resolve(result);
    };
    const onKey = (e: KeyboardEvent): void => {
        if (e.key !== KEY_ESCAPE) return;
        e.preventDefault();
        settle(false);
    };
    document.addEventListener(EVT_KEYDOWN, onKey);
    window.addEventListener(EVT_SCROLL, reposition, true);
    window.addEventListener(EVT_RESIZE, reposition);
    return {
        settle,
        bindActions: (a) => {
            actionsRef = a;
        },
    };
}

function inlineConfirm(host: Instance, opts: InlineConfirmOptions): Promise<boolean> {
    const existing = pendingHosts.get(host);
    if (existing !== undefined) existing();
    return new Promise<boolean>((resolve) => {
        const trigger = host.el.firstElementChild;
        if (!(trigger instanceof HTMLElement)) {
            resolve(false);
            return;
        }
        const anchor = findAnchor(trigger);
        if (anchor === null) {
            resolve(false);
            return;
        }
        const prevVisibility = trigger.style.visibility;
        trigger.style.visibility = VISIBILITY_HIDDEN;
        host.el.classList.add(CLASS_PENDING);
        const { settle, bindActions } = startOverlay({ host, trigger, anchor, prevVisibility, resolve });
        pendingHosts.set(host, () => settle(false));
        const { actions, confirmBtn } = buildActions(opts, settle);
        bindActions(actions);
        anchor.appendChild(actions.el);
        positionOverlay(actions.el, trigger, anchor);
        confirmBtn.el.focus();
    });
}

export { inlineConfirm, INLINE_CONFIRM_HOST_CLASS };
export type { InlineConfirmOptions };
