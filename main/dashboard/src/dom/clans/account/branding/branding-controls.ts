import { div, paragraph, type Instance } from "../../../factory";
import type { ManagedClan } from "../../../../state/clans/clans-client/index.js";
import { BrandingController } from "./branding-controller";
import { buildAvatarUpload } from "./avatar/avatar-upload.js";
import { buildAvatarTweaker } from "./avatar/avatar-tweaker/index.js";
import { buildColorPicker } from "./pickers/color-picker.js";
import { buildIconPicker } from "./pickers/icon-picker.js";
import {
    ACCOUNT_BRANDING_CLASS,
    ACCOUNT_BRANDING_ROW_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_INSTRUCTIONS_CLASS,
} from "../../../../shared/constants/account-constants.js";

function syncIconView(ctrl: BrandingController, tweakerBlock: Instance, avatarBlock: Instance): void {
    const tweakerVisible = ctrl.isTweakable();
    tweakerBlock.el.hidden = !tweakerVisible;
    avatarBlock.el.hidden = tweakerVisible;
}

export function buildBrandingControls(clan: ManagedClan): Instance {
    const ctrl = new BrandingController(clan);
    const status = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], text: "", context: null, meta: null });
    ctrl.statusEl = status;

    const { search, grid: iconGrid } = buildIconPicker(ctrl);
    const colorBlock = buildColorPicker(ctrl);
    const avatarBlock = buildAvatarUpload(ctrl);
    const tweakerBlock = buildAvatarTweaker(ctrl);

    const sync = (): void => syncIconView(ctrl, tweakerBlock, avatarBlock);
    ctrl.subscribe({ onIconStateChange: sync });
    sync();

    return div({ classes: [ACCOUNT_BRANDING_CLASS], context: null, meta: null }, [
        paragraph({
            classes: [ACCOUNT_INSTRUCTIONS_CLASS],
            text: "Pick an icon, set a color, or upload a custom image (.ico/.png/.svg/.webp/.jpg ≤ 10 MB).",
            context: null,
            meta: null,
        }),
        search,
        iconGrid,
        div({ classes: [ACCOUNT_BRANDING_ROW_CLASS], context: null, meta: null }, [
            colorBlock,
            avatarBlock,
            tweakerBlock,
        ]),
        status,
    ]);
}
