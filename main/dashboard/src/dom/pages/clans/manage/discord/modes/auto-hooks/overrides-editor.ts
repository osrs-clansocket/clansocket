import { div, span, wireInput, type Instance } from "../../../../../../factory";
import { glassInput } from "../../../../../../forms/glass/inputs/glass-input.js";
import {
    AUTO_HOOKS_CARD_LABEL_CLASS,
    AUTO_HOOKS_CARD_ROW_CLASS,
    AUTO_HOOKS_OVERRIDES_CLASS,
    OVERRIDES_HEADER_LABEL,
    WEBHOOK_AVATAR_OVERRIDE_LABEL,
    WEBHOOK_AVATAR_OVERRIDE_PLACEHOLDER,
    WEBHOOK_USERNAME_OVERRIDE_LABEL,
    WEBHOOK_USERNAME_OVERRIDE_PLACEHOLDER,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";

export interface OverridesState {
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
}

export interface OverridesCallbacks {
    onUsernameChange: (value: string | null) => void;
    onAvatarUrlChange: (value: string | null) => void;
}

function buildRow(label: string, control: Instance): Instance {
    return div({ classes: [AUTO_HOOKS_CARD_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [AUTO_HOOKS_CARD_LABEL_CLASS], text: label, context: null, meta: null }),
        control,
    ]);
}

function nullableValue(v: string | null): string {
    return v ?? "";
}

function nullify(v: string): string | null {
    return v.length === 0 ? null : v;
}

export function buildOverridesEditor(initial: OverridesState, cb: OverridesCallbacks): Instance {
    const usernameInp = glassInput({
        value: nullableValue(initial.webhookUsernameOverride),
        placeholder: WEBHOOK_USERNAME_OVERRIDE_PLACEHOLDER,
        ariaLabel: WEBHOOK_USERNAME_OVERRIDE_LABEL,
        context: "override the webhook's display name for this hook's posts",
        meta: ["input"],
    });
    wireInput(usernameInp.el, () => cb.onUsernameChange(nullify(usernameInp.el.value)));

    const avatarInp = glassInput({
        value: nullableValue(initial.webhookAvatarUrlOverride),
        placeholder: WEBHOOK_AVATAR_OVERRIDE_PLACEHOLDER,
        ariaLabel: WEBHOOK_AVATAR_OVERRIDE_LABEL,
        context: "override the webhook's avatar URL for this hook's posts",
        meta: ["input"],
    });
    wireInput(avatarInp.el, () => cb.onAvatarUrlChange(nullify(avatarInp.el.value)));

    return div({ classes: [AUTO_HOOKS_OVERRIDES_CLASS], context: null, meta: null }, [
        span({ classes: [AUTO_HOOKS_CARD_LABEL_CLASS], text: OVERRIDES_HEADER_LABEL, context: null, meta: null }),
        buildRow(WEBHOOK_USERNAME_OVERRIDE_LABEL, usernameInp),
        buildRow(WEBHOOK_AVATAR_OVERRIDE_LABEL, avatarInp),
    ]);
}
