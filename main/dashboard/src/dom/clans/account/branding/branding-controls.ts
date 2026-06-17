import { BTN_VARIANT_OUTLINE, button, div, paragraph, type Instance } from "../../../factory";
import type { ManagedClan } from "../../../../state/clans/clans-client/index.js";
import { BrandingController } from "./branding-controller";
import { buildAvatarUpload } from "./avatar/avatar-upload.js";
import { buildAvatarTweaker } from "./avatar/avatar-tweaker/index.js";
import { buildColorPicker } from "./pickers/color-picker.js";
import { buildIconPicker } from "./pickers/icon-picker.js";
import { isRasterProvider, resolveIcon } from "../../../../icons/providers.js";
import { router } from "../../../../managers/router/index.js";
import {
    ACCOUNT_BRANDING_CLASS,
    ACCOUNT_BRANDING_ROW_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_INSTRUCTIONS_CLASS,
} from "../../../../shared/constants/account-constants.js";

function buildVoxlabUrl(ctrl: BrandingController): string {
    const params = new URLSearchParams();
    if (ctrl.kind !== null) params.set("kind", ctrl.kind);
    if (ctrl.value !== null) params.set("value", ctrl.value);
    const query = params.toString();
    return `/clans/${ctrl.clan.slug}/voxlab${query.length > 0 ? `?${query}` : ""}`;
}

function syncIconView(ctrl: BrandingController, tweakerBlock: Instance, avatarBlock: Instance): void {
    // tweaker visible whenever there's an icon to act on (image or voxlab).
    // avatar visible only when there's no tweaker — the tweaker has its own
    // preview surface (canvas for image-kind, VoxlabRenderer for voxlab) so
    // showing the avatar block alongside it duplicates the preview.
    // builtin / null kinds: tweaker hidden (nothing to act on), avatar stays
    // so the user can click-to-upload.
    const isImage = ctrl.isTweakable();
    const hasIconToActOn = isImage || ctrl.kind === "voxlab";
    tweakerBlock.el.hidden = !hasIconToActOn;
    avatarBlock.el.hidden = hasIconToActOn;
}

export function buildBrandingControls(clan: ManagedClan): Instance {
    const ctrl = new BrandingController(clan);
    const status = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], text: "", context: null, meta: null });
    ctrl.statusEl = status;

    const { search, grid: iconGrid } = buildIconPicker(ctrl);
    const colorBlock = buildColorPicker(ctrl);
    const avatarBlock = buildAvatarUpload(ctrl);
    const tweakerBlock = buildAvatarTweaker(ctrl);
    const editVoxlabBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Edit in Voxlab",
        context: "open the voxlab editor for the current icon",
        meta: ["action", "clan"],
        onClick: () => router.navigate(buildVoxlabUrl(ctrl)),
    });
    editVoxlabBtn.el.hidden = ctrl.kind === null;

    const sync = (): void => {
        syncIconView(ctrl, tweakerBlock, avatarBlock);
        const tweakerVisible = ctrl.isTweakable() || ctrl.kind === "voxlab";
        // Two cases that aren't voxlab-loadable:
        //   1. .ico images — kind="image", value="ico"
        //   2. picker raster icons (OSRS sprites) — kind="builtin" whose
        //      provider is a raster provider (the "kind: raster" entries in
        //      icons/providers.ts, currently just `osrs`)
        // font icons + svg images stay visible so the button still works for
        // them.
        const isIcoImage = ctrl.kind === "image" && ctrl.value === "ico";
        const isRasterBuiltin =
            ctrl.kind === "builtin" && ctrl.value !== null && isRasterProvider(resolveIcon(ctrl.value).provider);
        const shouldHide = tweakerVisible || ctrl.kind === null || isIcoImage || isRasterBuiltin;
        editVoxlabBtn.el.hidden = shouldHide;
        editVoxlabBtn.el.style.display = shouldHide ? "none" : "";
    };
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
        editVoxlabBtn,
        div({ classes: [ACCOUNT_BRANDING_ROW_CLASS], context: null, meta: null }, [
            colorBlock,
            avatarBlock,
            tweakerBlock,
        ]),
        status,
    ]);
}
