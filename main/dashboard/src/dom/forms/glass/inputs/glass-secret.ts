import { button, div, icon, span, type Instance } from "../../../factory/index.js";

const CLASS_ROOT = "glass-secret";
const CLASS_REVEALED = "glass-secret--revealed";
const CLASS_VALUE = "glass-secret__value";
const CLASS_TOGGLE = "glass-secret__toggle";
const ICON_HIDDEN = "eye-slash";
const ICON_REVEALED = "eye";

export function glassSecret(value: string): Instance {
    const valueEl = span({ classes: [CLASS_VALUE], text: value, context: null, meta: null });
    const iconEl = icon({ name: ICON_HIDDEN, context: null, meta: null });
    const root = div({ classes: [CLASS_ROOT], context: null, meta: null }, [valueEl]);
    const toggle = button(
        {
            classes: [CLASS_TOGGLE],
            ariaLabel: "Reveal",
            title: "Reveal",
            type: "button",
            context: "reveal or hide the secret value",
            meta: ["action"],
            onClick: (e) => {
                e.stopPropagation();
                const isRevealed = root.el.classList.toggle(CLASS_REVEALED);
                toggle.setAttr("aria-label", isRevealed ? "hide" : "reveal");
                toggle.setAttr("title", isRevealed ? "hide" : "reveal");
                iconEl.el.classList.remove(`bi-${ICON_HIDDEN}`, `bi-${ICON_REVEALED}`);
                iconEl.el.classList.add(`bi-${isRevealed ? ICON_REVEALED : ICON_HIDDEN}`);
            },
        },
        [iconEl],
    );
    root.addChild(toggle);
    return root;
}
