import { input, type Instance } from "../../../../../factory/index.js";
import type { IconTransform } from "../../../../../../state/clans/clans-client/index.js";
import type { BrandingController } from "../../branding-controller/index.js";
import {
    clamp,
    ROTATE_MAX,
    ROTATE_MIN,
    ROTATE_STEP,
    SCALE_MAX,
    SCALE_MIN,
    SCALE_STEP,
    TRANSLATE_MAX,
    TRANSLATE_STEP,
} from "./constants.js";
import { SLIDER_CLASS } from "../../../../../../shared/constants/input-constants.js";
import { TWEAKER_SLIDER_CLASS } from "../../../../../../shared/constants/branding-tweaker-constants.js";

export interface SliderBundle {
    scale: Instance<HTMLInputElement>;
    rotate: Instance<HTMLInputElement>;
    translateX: Instance<HTMLInputElement>;
    translateY: Instance<HTMLInputElement>;
    syncToTransform: (t: IconTransform) => void;
}

export function createSliders(ctrl: BrandingController, render: () => void): SliderBundle {
    const scaleInput = input({
        classes: [SLIDER_CLASS, TWEAKER_SLIDER_CLASS],
        type: "range",
        min: String(SCALE_MIN),
        max: String(SCALE_MAX),
        step: String(SCALE_STEP),
        value: String(ctrl.transform.scale),
        ariaLabel: "Scale",
        context: "adjust the avatar scale",
        meta: ["input", "clan"],
        onInput: () => {
            const v = clamp(Number(scaleInput.el.value), SCALE_MIN, SCALE_MAX);
            ctrl.setTransform({ scale: v });
            render();
        },
    });
    const rotateInput = input({
        classes: [SLIDER_CLASS, TWEAKER_SLIDER_CLASS],
        type: "range",
        min: String(ROTATE_MIN),
        max: String(ROTATE_MAX),
        step: String(ROTATE_STEP),
        value: String(ctrl.transform.rotate),
        ariaLabel: "Rotate",
        context: "adjust the avatar rotation",
        meta: ["input", "clan"],
        onInput: () => {
            const v = clamp(Number(rotateInput.el.value), ROTATE_MIN, ROTATE_MAX);
            ctrl.setTransform({ rotate: v });
            render();
        },
    });
    const translateXInput = input({
        classes: [SLIDER_CLASS, TWEAKER_SLIDER_CLASS],
        type: "range",
        min: String(-TRANSLATE_MAX),
        max: String(TRANSLATE_MAX),
        step: String(TRANSLATE_STEP),
        value: String(ctrl.transform.translateX),
        ariaLabel: "Position X",
        context: "adjust the avatar horizontal position",
        meta: ["input", "clan"],
        onInput: () => {
            const v = clamp(Number(translateXInput.el.value), -TRANSLATE_MAX, TRANSLATE_MAX);
            ctrl.setTransform({ translateX: v });
            render();
        },
    });
    const translateYInput = input({
        classes: [SLIDER_CLASS, TWEAKER_SLIDER_CLASS],
        type: "range",
        min: String(-TRANSLATE_MAX),
        max: String(TRANSLATE_MAX),
        step: String(TRANSLATE_STEP),
        value: String(ctrl.transform.translateY),
        ariaLabel: "Position Y",
        context: "adjust the avatar vertical position",
        meta: ["input", "clan"],
        onInput: () => {
            const v = clamp(Number(translateYInput.el.value), -TRANSLATE_MAX, TRANSLATE_MAX);
            ctrl.setTransform({ translateY: v });
            render();
        },
    });
    return {
        scale: scaleInput,
        rotate: rotateInput,
        translateX: translateXInput,
        translateY: translateYInput,
        syncToTransform: (t) => {
            if (scaleInput.el.value !== String(t.scale)) scaleInput.el.value = String(t.scale);
            if (rotateInput.el.value !== String(t.rotate)) rotateInput.el.value = String(t.rotate);
            if (translateXInput.el.value !== String(t.translateX)) translateXInput.el.value = String(t.translateX);
            if (translateYInput.el.value !== String(t.translateY)) translateYInput.el.value = String(t.translateY);
        },
    };
}
