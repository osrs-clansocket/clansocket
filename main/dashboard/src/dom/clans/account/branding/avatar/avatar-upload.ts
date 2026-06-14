import { div, input, span, type Instance } from "../../../../factory/index.js";
import type { BrandingController } from "../branding-controller/index.js";
import { FORM_FIELD_LABEL } from "../../../../forms/form-classes.js";
import {
    ACCOUNT_BRANDING_AVATAR_BLOCK_CLASS,
    ACCOUNT_BRANDING_AVATAR_CLASS,
    ACCOUNT_BRANDING_AVATAR_UPLOAD_CAPTION_CLASS,
    ACCOUNT_BRANDING_UPLOAD_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export function buildAvatarUpload(ctrl: BrandingController): Instance {
    const avatar = div({
        classes: [ACCOUNT_BRANDING_AVATAR_CLASS],
        context: "upload a clan icon image",
        meta: ["action", "clan"],
        onClick: () => fileInput.el.click(),
    });

    ctrl.avatarEl = avatar.el;
    ctrl.renderAvatar();

    const fileInput = input({
        classes: [ACCOUNT_BRANDING_UPLOAD_CLASS],
        type: "file",
        accept: "image/x-icon,image/png,image/svg+xml,image/webp,image/jpeg,.ico,.png,.svg,.webp,.jpg,.jpeg",
        ariaLabel: "Upload clan icon",
        context: "choose a clan icon image file to upload",
        meta: ["input", "clan"],
        onChange: async () => {
            const file = fileInput.el.files?.[0];
            if (!file) return;
            await ctrl.uploadImage(file);
        },
    });

    avatar.setAttr("role", "button").setAttr("tabindex", "0").setAttr("aria-label", "upload custom image");
    avatar.el.title = "click to upload .ico / .png / .svg / .webp / .jpg";

    ctrl.triggerUpload = () => fileInput.el.click();

    const uploadCaption = span({
        classes: [ACCOUNT_BRANDING_AVATAR_UPLOAD_CAPTION_CLASS],
        text: "Upload",
        context: "upload a clan icon image",
        meta: ["action", "clan"],
        onClick: () => fileInput.el.click(),
    });

    return div({ classes: [ACCOUNT_BRANDING_AVATAR_BLOCK_CLASS], context: null, meta: null }, [
        span({ classes: [FORM_FIELD_LABEL], text: "Preview", context: null, meta: null }),
        avatar,
        uploadCaption,
        fileInput,
    ]);
}
