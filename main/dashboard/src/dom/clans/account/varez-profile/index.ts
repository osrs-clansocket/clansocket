import { BTN_VARIANT_OUTLINE, button, createInstance, div, paragraph, section } from "../../../factory";
import { profileStore, type ProfileContext } from "../../../../ai/profile-store";
import { FORM_CLASS, FORM_ROW_CLASS, HINT_CLASS, setEditing } from "./state.js";
import { renderIdentity } from "./identity/index.js";
import { renderFocus } from "./focus.js";
import { renderSession } from "./session/index.js";

function renderVarezProfile(host: HTMLElement): void {
    const profile: ProfileContext = profileStore.load();
    const rerender = (): void => renderVarezProfile(host);
    const helpEl = paragraph({
        classes: [HINT_CLASS],
        text: "Varez's picture of you, built across conversations. Stored only in this browser — edit any field, clear any time.",
        context: null,
        meta: null,
    });

    const clearBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Clear profile",
        ariaLabel: "Clear Varez profile",
        context: "clear the entire Varez profile",
        meta: ["destructive"],
        onClick: () => {
            setEditing(null);
            profileStore.clear();
            rerender();
        },
    });

    const sec = section({ classes: [FORM_CLASS], context: null, meta: null }, [helpEl]);
    renderIdentity(sec.el, profile.identity, rerender);
    renderFocus(sec.el, profile.focus, rerender);
    renderSession(sec.el, profile.session, rerender);
    sec.addChild(div({ classes: [FORM_ROW_CLASS], context: null, meta: null }, [clearBtn]));

    createInstance(host).setChildren(sec);
}

export { renderVarezProfile };
