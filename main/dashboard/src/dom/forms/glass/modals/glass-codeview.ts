import {
    button,
    code,
    createInstance,
    div,
    heading,
    icon,
    modal,
    pre,
    scrollContainer,
    type Instance,
} from "../../../factory/index.js";
import { BS_ICON_EYE_CLASS, BS_ICON_EYE_SLASH_CLASS } from "../../../../shared/constants/bootstrap-icon-constants.js";
import {
    GLASS_CODEVIEW_CLASS,
    GLASS_CODEVIEW_CLOSE_CLASS,
    GLASS_CODEVIEW_HEADER_CLASS,
    GLASS_CODEVIEW_PRE_BLURRED_CLASS,
    GLASS_CODEVIEW_PRE_CLASS,
    GLASS_CODEVIEW_SCROLL_CLASS,
    GLASS_CODEVIEW_TITLE_CLASS,
    GLASS_CONFIRM_OPEN_CLASS,
    GLASS_CONFIRM_OVERLAY_CLASS,
    GLASS_SECRET_TOGGLE_CLASS,
} from "../../../../shared/constants/glass-constants.js";

export interface CodeViewOptions {
    title: string;
    content: string;
    secret?: boolean;
}

function maybePrettyJson(content: string): string {
    const t = content.trim();
    const looksJson = (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
    if (!looksJson) return content;
    try {
        return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
        return content;
    }
}

function buildSecretToggle(preEl: Instance, initiallyRevealed: boolean): Instance {
    let revealed = initiallyRevealed;
    if (!revealed) preEl.el.classList.add(GLASS_CODEVIEW_PRE_BLURRED_CLASS);
    const iconEl = icon({ name: revealed ? "eye" : "eye-slash", context: null, meta: null });
    const btn = button(
        {
            classes: [GLASS_SECRET_TOGGLE_CLASS],
            ariaLabel: revealed ? "hide" : "reveal",
            title: revealed ? "hide" : "reveal",
            type: "button",
            context: "reveal or hide the secret value",
            meta: ["action"],
            onClick: (e) => {
                e.stopPropagation();
                revealed = !revealed;
                preEl.el.classList.toggle(GLASS_CODEVIEW_PRE_BLURRED_CLASS, !revealed);
                iconEl.el.classList.remove(BS_ICON_EYE_SLASH_CLASS, BS_ICON_EYE_CLASS);
                iconEl.el.classList.add(revealed ? BS_ICON_EYE_CLASS : BS_ICON_EYE_SLASH_CLASS);
                btn.setAttr("aria-label", revealed ? "hide" : "reveal");
                btn.setAttr("title", revealed ? "hide" : "reveal");
            },
        },
        [iconEl],
    );
    return btn;
}

export function glassCodeView(opts: CodeViewOptions): void {
    const text = maybePrettyJson(opts.content);
    const codeEl = code({ text, context: null, meta: null });
    const preEl = pre({ classes: [GLASS_CODEVIEW_PRE_CLASS], context: null, meta: null }, [codeEl]);
    const scrollWrap = scrollContainer({ classes: [GLASS_CODEVIEW_SCROLL_CLASS], context: null, meta: null }, [preEl]);
    const headerChildren: Instance[] = [
        heading("h2", { classes: [GLASS_CODEVIEW_TITLE_CLASS], text: opts.title, context: null, meta: null }),
    ];
    if (opts.secret) headerChildren.push(buildSecretToggle(preEl, false));
    const closeBtn = button(
        {
            classes: [GLASS_CODEVIEW_CLOSE_CLASS],
            ariaLabel: "Close",
            type: "button",
            context: "close the code view",
            meta: ["action"],
            onClick: () => m.dismiss(),
        },
        [icon({ name: "x-lg", context: null, meta: null })],
    );
    headerChildren.push(closeBtn);
    const headerEl = div({ classes: [GLASS_CODEVIEW_HEADER_CLASS], context: null, meta: null }, headerChildren);
    const m = modal(
        {
            overlayClasses: [GLASS_CONFIRM_OVERLAY_CLASS],
            dialogClasses: [GLASS_CODEVIEW_CLASS],
            openClass: GLASS_CONFIRM_OPEN_CLASS,
            context: null,
            meta: null,
            initialFocus: () => closeBtn.el,
        },
        [headerEl, scrollWrap],
    );
    const dialogInst = createInstance(m.dialogEl);
    dialogInst.setAttr("role", "dialog");
    dialogInst.setAttr("aria-modal", "true");
    createInstance(document.body).addChild(m);
    m.open();
}
