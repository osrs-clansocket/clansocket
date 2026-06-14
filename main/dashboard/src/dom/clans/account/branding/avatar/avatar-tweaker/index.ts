import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    image,
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

export function buildAvatarTweaker(ctrl: BrandingController): Instance {
    const block = div({ classes: [TWEAKER_BLOCK_CLASS], context: null, meta: null });
    block.el.hidden = !ctrl.isTweakable();

    const labelEl = span({ classes: [FORM_FIELD_LABEL], text: "Tweak", context: null, meta: null });
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
    const removeBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [TWEAKER_ACTION_CLASS, ACCOUNT_REMOVE_BTN_CLASS],
        text: "Remove icon",
        context: "remove the clan avatar icon",
        meta: ["destructive", "clan"],
        onClick: async () => {
            removeBtn.el.disabled = true;
            await ctrl.persist(null, null);
            removeBtn.el.disabled = false;
        },
    });

    ctrl.subscribe({
        onTransformChange: (t) => {
            sliders.syncToTransform(t);
            render();
        },
        onCustomizedChange: () => {
            refreshSource();
        },
        onIconStateChange: () => {
            block.el.hidden = !ctrl.isTweakable();
        },
        onSaveStateChange: (state) => {
            if (state === "saving") statusEl.setText("Saving…");
            else if (state === "error") statusEl.setText("Save failed.");
            else statusEl.setText("");
        },
    });

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

    const canvasStack = div({ classes: [TWEAKER_CANVAS_STACK_CLASS], context: null, meta: null }, [
        canvasInst,
        hiddenSource,
    ]);

    uploadBtn.toggleClass(TWEAKER_ACTION_UPLOAD_CLASS, true);

    block.setChildren(
        labelEl,
        div({ classes: [TWEAKER_BODY_CLASS], context: null, meta: null }, [controls, canvasStack]),
        div({ classes: [TWEAKER_ACTIONS_CLASS], context: null, meta: null }, [
            div({ classes: [TWEAKER_ACTIONS_PAIR_CLASS], context: null, meta: null }, [revertBtn, removeBtn]),
            uploadBtn,
        ]),
    );

    requestAnimationFrame(() => render());

    return block;
}
