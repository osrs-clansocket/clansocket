import { button, div, input, span, type Instance } from "../../factory";
import { effect } from "../../factory";
import { persistedSignal } from "../../../state/persistence";
import { BS_ICON_CLASS, BS_ICON_ZOOM_IN_CLASS } from "../../../shared/constants/bootstrap-icon-constants.js";
import {
    DASH_ZOOM_CLASS,
    DASH_ZOOM_SLIDER_CLASS,
    DASH_ZOOM_SLIDER_WRAP_CLASS,
    DASH_ZOOM_TOGGLE_CLASS,
} from "../../../shared/constants/dashboard-shell-constants.js";
import { SLIDER_CLASS } from "../../../shared/constants/input-constants.js";

const ZOOM_MIN = 85;
const ZOOM_MAX = 135;
const ZOOM_DEFAULT = 100;
const ZOOM_STEP = 1;
const FS_ROOT_VAR = "--fs-root";

const zoom$ = persistedSignal("dashboard.zoom", ZOOM_DEFAULT);

function clampZoom(raw: number): number {
    const rounded = Math.round(raw);
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, rounded));
}

effect(() => {
    const value = clampZoom(zoom$());
    document.documentElement.style.setProperty(FS_ROOT_VAR, `${value}%`);
});

function shell(className: string, children: readonly Instance[]): Instance {
    return div({ classes: [className], context: null, meta: null }, children);
}

function buildSlider(): Instance<HTMLInputElement> {
    const inst = input({
        classes: [SLIDER_CLASS, DASH_ZOOM_SLIDER_CLASS],
        type: "range",
        min: String(ZOOM_MIN),
        max: String(ZOOM_MAX),
        step: String(ZOOM_STEP),
        value: String(clampZoom(zoom$())),
        ariaLabel: "UI scale percent",
        context: "adjust UI scale percent",
        meta: ["input"],
        onInput: () => {
            zoom$.set(clampZoom(Number(inst.el.value)));
        },
    });
    return inst;
}

function buildToggle(): Instance<HTMLButtonElement> {
    return button(
        {
            classes: [DASH_ZOOM_TOGGLE_CLASS],
            ariaLabel: "Adjust UI scale",
            title: "UI scale",
            context: "open the UI scale slider",
            meta: ["action"],
        },
        [span({ classes: [BS_ICON_CLASS, BS_ICON_ZOOM_IN_CLASS], ariaHidden: "true", context: null, meta: null })],
    );
}

export function buildZoomControl(): HTMLElement {
    const toggle = buildToggle();
    const sliderWrap = shell(DASH_ZOOM_SLIDER_WRAP_CLASS, [buildSlider()]);
    return shell(DASH_ZOOM_CLASS, [toggle, sliderWrap]).el;
}
