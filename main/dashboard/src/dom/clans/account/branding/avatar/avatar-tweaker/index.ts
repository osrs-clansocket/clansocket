import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    image,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    scratchCanvas,
    span,
    type Instance,
} from "../../../../../factory/index.js";
import type { BrandingController } from "../../branding-controller/index.js";
import { CANVAS_PX } from "./constants.js";
import { wireDragPan } from "./drag.js";
import { createRenderer, type PreviewState } from "./render.js";
import { createSliders } from "./sliders.js";
import { FORM_FIELD_LABEL } from "../../../../../forms/form-classes.js";
import { ACCOUNT_REMOVE_BTN_CLASS } from "../../../../../../shared/constants/account-constants.js";
import { router } from "../../../../../../managers/router/index.js";
import { clanModelIcon } from "../../../../../factory/data-ops/clan-model-icon.js";
import {
    TWEAKER_ACTION_CLASS,
    TWEAKER_ACTION_UPLOAD_CLASS,
    TWEAKER_ACTIONS_CLASS,
    TWEAKER_ACTIONS_PAIR_CLASS,
    TWEAKER_BLOCK_CLASS,
    TWEAKER_BODY_CLASS,
    TWEAKER_CANVAS_CLASS,
    TWEAKER_CANVAS_STACK_CLASS,
    TWEAKER_CONTROLS_CLASS,
    TWEAKER_ROW_CLASS,
    TWEAKER_SLIDER_LABEL_CLASS,
    TWEAKER_SOURCE_CLASS,
    TWEAKER_STATUS_CLASS,
} from "../../../../../../shared/constants/branding-tweaker-constants.js";

function buildVoxlabUrl(ctrl: BrandingController): string {
    const params = new URLSearchParams();
    if (ctrl.kind !== null) params.set("kind", ctrl.kind);
    if (ctrl.value !== null) params.set("value", ctrl.value);
    const query = params.toString();
    return `/clans/${ctrl.clan.slug}/voxlab${query.length > 0 ? `?${query}` : ""}`;
}

export function buildAvatarTweaker(ctrl: BrandingController): Instance {
    const block = div({ classes: [TWEAKER_BLOCK_CLASS], context: null, meta: null });
    // The outer block stays visible whenever there's an icon to act on so the
    // Edit-with-Voxlab / Upload / Remove buttons remain reachable for voxlab-
    // kind icons (which aren't isTweakable but ARE eligible for re-editing,
    // removal, or replacement). The inner canvas + sliders + "Tweak" label
    // hide individually based on isTweakable (they only apply to raster).

    const labelEl = span({ classes: [FORM_FIELD_LABEL], text: "Tweak", context: null, meta: null });
    labelEl.el.hidden = !ctrl.isTweakable();
    const statusEl = span({ classes: [TWEAKER_STATUS_CLASS], text: "", context: null, meta: null });

    const canvasInst = scratchCanvas({
        width: CANVAS_PX,
        height: CANVAS_PX,
        classes: [TWEAKER_CANVAS_CLASS],
        context: null,
        meta: null,
    });
    const ctx = canvasInst.el.getContext("2d");

    const previewState: PreviewState = { image: null, loaded: false };
    const hiddenSource = image({
        src: ctrl.pristineIconUrl(),
        classes: [TWEAKER_SOURCE_CLASS],
        alt: "",
        lazy: false,
        context: null,
        meta: null,
    });
    hiddenSource.el.hidden = true;
    hiddenSource.el.crossOrigin = "anonymous";
    previewState.image = hiddenSource.el;

    const render = createRenderer(ctx, canvasInst.el, ctrl, previewState);
    hiddenSource.el.addEventListener("load", () => {
        previewState.loaded = true;
        render();
    });
    hiddenSource.el.addEventListener("error", () => {
        previewState.loaded = false;
        render();
    });

    const refreshSource = (): void => {
        previewState.loaded = false;
        hiddenSource.el.src = ctrl.pristineIconUrl();
    };

    const sliders = createSliders(ctrl, render);
    wireDragPan(canvasInst, ctrl, render);

    const uploadBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [TWEAKER_ACTION_CLASS],
        text: "Upload",
        context: "upload a new clan avatar image",
        meta: ["action", "clan"],
        onClick: () => ctrl.triggerUpload(),
    });
    const revertBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [TWEAKER_ACTION_CLASS],
        text: "Revert tweaks",
        context: "revert avatar tweaks to the last saved transform",
        meta: ["action", "clan"],
        onClick: async () => {
            revertBtn.el.disabled = true;
            await ctrl.revertTweaks();
            revertBtn.el.disabled = false;
        },
    });
    const removeHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const removeBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [TWEAKER_ACTION_CLASS, ACCOUNT_REMOVE_BTN_CLASS],
        text: "Remove icon",
        context: "remove the clan avatar icon",
        meta: ["destructive", "clan"],
        onClick: async () => {
            const confirmed = await inlineConfirm(removeHost, {
                cancelLabel: "Cancel",
                confirmLabel: "Remove",
                danger: true,
                cancelContext: "keep the current clan avatar icon",
                confirmContext: "confirm removing the clan avatar icon",
            });
            if (!confirmed) return;
            removeBtn.el.disabled = true;
            await ctrl.persist(null, null);
            removeBtn.el.disabled = false;
        },
    });
    removeHost.addChild(removeBtn);
    const voxlabBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [TWEAKER_ACTION_CLASS],
        text: "Edit in Voxlab",
        context: "open the voxlab editor to animate + style this avatar as a 3D logo",
        meta: ["action", "clan"],
        onClick: () => router.navigate(buildVoxlabUrl(ctrl)),
    });
    voxlabBtn.el.hidden = !ctrl.isVoxlabEligible();
    // revert-tweaks only applies to raster image transforms; voxlab edits are
    // recorded into the published envelope and reverted from the voxlab editor
    // itself. Hide for non-tweakable kinds.
    revertBtn.el.hidden = !ctrl.isTweakable();

    const controls = div({ classes: [TWEAKER_CONTROLS_CLASS], context: null, meta: null }, [
        div({ classes: [TWEAKER_ROW_CLASS], context: null, meta: null }, [
            span({ classes: [TWEAKER_SLIDER_LABEL_CLASS], text: "Scale", context: null, meta: null }),
            sliders.scale,
        ]),
        div({ classes: [TWEAKER_ROW_CLASS], context: null, meta: null }, [
            span({ classes: [TWEAKER_SLIDER_LABEL_CLASS], text: "Rotate", context: null, meta: null }),
            sliders.rotate,
        ]),
        div({ classes: [TWEAKER_ROW_CLASS], context: null, meta: null }, [
            span({ classes: [TWEAKER_SLIDER_LABEL_CLASS], text: "Pos X", context: null, meta: null }),
            sliders.translateX,
        ]),
        div({ classes: [TWEAKER_ROW_CLASS], context: null, meta: null }, [
            span({ classes: [TWEAKER_SLIDER_LABEL_CLASS], text: "Pos Y", context: null, meta: null }),
            sliders.translateY,
        ]),
        statusEl,
    ]);

    // voxlab kind shares the canvas slot with the raster tweaker but uses
    // the centralized clanModelIcon component. The component handles its own
    // renderer mount + transform subscription, identical to every other
    // clan-avatar render site (header, your-clans entries, sidebar). Slider
    // drags emit CLAN_TRANSFORM_CHANGED via ctrl.setTransform; every
    // clanModelIcon instance for this slug (including this one) reacts.
    const voxlabHost = ctrl.clan.slug
        ? clanModelIcon({
              slug: ctrl.clan.slug,
              imageVersion: ctrl.imageVersion,
              initialTransform: ctrl.transform,
              context: null,
              meta: null,
          })
        : div({ classes: [], context: null, meta: null });
    voxlabHost.el.classList.add(TWEAKER_CANVAS_CLASS);
    voxlabHost.el.hidden = true;

    const canvasStack = div({ classes: [TWEAKER_CANVAS_STACK_CLASS], context: null, meta: null }, [
        canvasInst,
        voxlabHost,
        hiddenSource,
    ]);
    canvasStack.el.style.overflow = "hidden";
    canvasStack.el.style.position = "relative";

    const bodyEl = div({ classes: [TWEAKER_BODY_CLASS], context: null, meta: null }, [controls, canvasStack]);

    const applyKindVisibility = (): void => {
        const isImage = ctrl.isTweakable();
        const isVoxlab = ctrl.kind === "voxlab";
        labelEl.el.hidden = !isImage;
        controls.el.hidden = !isImage;
        canvasInst.el.hidden = !isImage;
        voxlabHost.el.hidden = !isVoxlab;
        bodyEl.el.hidden = !(isImage || isVoxlab);
        revertBtn.el.hidden = !isImage;
        voxlabBtn.el.hidden = !ctrl.isVoxlabEligible();
    };
    applyKindVisibility();

    ctrl.subscribe({
        onTransformChange: (t) => {
            sliders.syncToTransform(t);
            render();
            // voxlab arm: CSS transform on the clanModelIcon's renderTarget
            // is driven by the CLAN_TRANSFORM_CHANGED event emitted from
            // ctrl.setTransform — no local apply needed here.
        },
        onCustomizedChange: () => {
            refreshSource();
        },
        onIconStateChange: () => {
            applyKindVisibility();
        },
        onSaveStateChange: (state) => {
            if (state === "saving") statusEl.setText("Saving…");
            else if (state === "error") statusEl.setText("Save failed.");
            else statusEl.setText("");
        },
    });

    uploadBtn.toggleClass(TWEAKER_ACTION_UPLOAD_CLASS, true);

    block.setChildren(
        labelEl,
        bodyEl,
        div({ classes: [TWEAKER_ACTIONS_CLASS], context: null, meta: null }, [
            div({ classes: [TWEAKER_ACTIONS_PAIR_CLASS], context: null, meta: null }, [revertBtn, removeHost]),
            div({ classes: [TWEAKER_ACTIONS_PAIR_CLASS], context: null, meta: null }, [voxlabBtn, uploadBtn]),
        ]),
    );

    requestAnimationFrame(() => render());

    return block;
}
