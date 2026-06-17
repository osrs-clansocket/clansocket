import { BaseVoxlabComponent } from "../../../../../managers/voxlab/base/base-voxlab-component.js";
import {
    createColorInput,
    createSliderInput,
    createToggleInput,
} from "../../../../../voxlab/formatters/control-formatter.js";
import {
    BRUSH_OPACITY_MAX,
    BRUSH_OPACITY_MIN,
    BRUSH_OPACITY_STEP,
    BRUSH_RADIUS_MAX,
    BRUSH_RADIUS_MIN,
    BRUSH_RADIUS_STEP,
    DEFAULT_BRUSH_STATE,
    FALLOFF_SIGMA_MAX,
    FALLOFF_SIGMA_MIN,
    FALLOFF_SIGMA_STEP,
} from "../../../../../shared/constants/voxlab/texture-paint-constants.js";
import {
    pathColor,
    pathNumber,
    pathStep,
    snapshotRegistry,
    type PathSpec,
} from "../../../../../state/voxlab/registries/snapshot-registry.js";
import type {
    BrushChangeEventDetail,
    BrushMode,
    BrushState,
    PaintClearAllEventDetail,
} from "../../../../../shared/types/voxlab/paint-types.js";
import { DropdownComponent, type DropdownChangeDetail } from "../../panels/dropdown-component.js";

const BRUSH_PATHS: ReadonlyArray<PathSpec> = [
    pathColor("color", "color"),
    pathNumber("radius", "radius"),
    pathNumber("falloffSigma", "falloffSigma"),
    pathNumber("opacity", "opacity"),
    pathStep("mode", "mode"),
    pathStep("paintMode", "paintMode"),
    pathStep("eyedropper", "eyedropper"),
    pathStep("mirrorX", "mirrorX"),
    pathStep("mirrorY", "mirrorY"),
    pathStep("mirrorZ", "mirrorZ"),
    pathStep("hideBackFaces", "hideBackFaces"),
];

export class PaintSection extends BaseVoxlabComponent {
    private settings: BrushState = { ...DEFAULT_BRUSH_STATE };
    private inputs!: {
        color: HTMLInputElement;
        radius: HTMLInputElement;
        falloffSigma: HTMLInputElement;
        opacity: HTMLInputElement;
        paintMode: HTMLInputElement;
        eyedropper: HTMLInputElement;
        mirrorX: HTMLInputElement;
        mirrorY: HTMLInputElement;
        mirrorZ: HTMLInputElement;
        hideBackFaces: HTMLInputElement;
    };
    private modeDropdown!: DropdownComponent<BrushMode>;

    constructor() {
        super();
        snapshotRegistry.register<BrushState>({
            name: "brush",
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths: BRUSH_PATHS,
        });
    }

    get current(): BrushState {
        return { ...this.settings };
    }

    apply(state: BrushState, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        if (this.inputs) {
            this.inputs.color.value = this.settings.color;
            this.inputs.radius.value = String(this.settings.radius);
            this.inputs.falloffSigma.value = String(this.settings.falloffSigma);
            this.inputs.opacity.value = String(this.settings.opacity);
            this.inputs.paintMode.checked = this.settings.paintMode;
            this.inputs.eyedropper.checked = this.settings.eyedropper;
            this.inputs.mirrorX.checked = this.settings.mirrorX;
            this.inputs.mirrorY.checked = this.settings.mirrorY;
            this.inputs.mirrorZ.checked = this.settings.mirrorZ;
            this.inputs.hideBackFaces.checked = this.settings.hideBackFaces;
        }
        if (this.modeDropdown) {
            this.modeDropdown.select(this.settings.mode);
        }
        if (!opts?.silent) {
            this.emitChange();
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_BRUSH_STATE });
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Paint";
        section.appendChild(heading);

        const colorPicker = createColorInput({
            label: "Color",
            value: this.settings.color,
        });
        colorPicker.input.addEventListener("input", () => {
            this.settings.color = colorPicker.input.value;
            this.emitChange();
        });
        section.appendChild(colorPicker.wrapper);

        const radiusSlider = createSliderInput({
            label: "Brush radius",
            min: BRUSH_RADIUS_MIN,
            max: BRUSH_RADIUS_MAX,
            step: BRUSH_RADIUS_STEP,
            value: this.settings.radius,
            formatValue: (n) => n.toFixed(2),
        });
        radiusSlider.input.addEventListener("input", () => {
            this.settings.radius = Number.parseFloat(radiusSlider.input.value);
            this.emitChange();
        });
        section.appendChild(radiusSlider.wrapper);

        const falloffSlider = createSliderInput({
            label: "Falloff",
            min: FALLOFF_SIGMA_MIN,
            max: FALLOFF_SIGMA_MAX,
            step: FALLOFF_SIGMA_STEP,
            value: this.settings.falloffSigma,
            formatValue: (n) => n.toFixed(2),
        });
        falloffSlider.input.addEventListener("input", () => {
            this.settings.falloffSigma = Number.parseFloat(falloffSlider.input.value);
            this.emitChange();
        });
        section.appendChild(falloffSlider.wrapper);

        const opacitySlider = createSliderInput({
            label: "Opacity",
            min: BRUSH_OPACITY_MIN,
            max: BRUSH_OPACITY_MAX,
            step: BRUSH_OPACITY_STEP,
            value: this.settings.opacity,
            formatValue: (n) => n.toFixed(2),
        });
        opacitySlider.input.addEventListener("input", () => {
            this.settings.opacity = Number.parseFloat(opacitySlider.input.value);
            this.emitChange();
        });
        section.appendChild(opacitySlider.wrapper);

        this.modeDropdown = new DropdownComponent<BrushMode>(
            [
                { value: "paint", label: "Paint" },
                { value: "erase", label: "Erase" },
            ],
            this.settings.mode,
        );
        this.modeDropdown.mount(section);
        this.modeDropdown.addEventListener("change", (e) => {
            const detail = (e as CustomEvent<DropdownChangeDetail<BrushMode>>).detail;
            this.settings.mode = detail.value;
            this.emitChange();
        });

        const paintModeToggle = createToggleInput({
            label: "Paint mode (drag to paint)",
            checked: this.settings.paintMode,
        });
        paintModeToggle.input.addEventListener("change", () => {
            this.settings.paintMode = paintModeToggle.input.checked;
            this.emitChange();
        });
        section.appendChild(paintModeToggle.wrapper);

        const eyedropperToggle = createToggleInput({
            label: "Eyedropper (click mesh to pick color)",
            checked: this.settings.eyedropper,
        });
        eyedropperToggle.input.addEventListener("change", () => {
            this.settings.eyedropper = eyedropperToggle.input.checked;
            this.emitChange();
        });
        section.appendChild(eyedropperToggle.wrapper);

        const mirrorXToggle = createToggleInput({ label: "Mirror X", checked: this.settings.mirrorX });
        mirrorXToggle.input.addEventListener("change", () => {
            this.settings.mirrorX = mirrorXToggle.input.checked;
            this.emitChange();
        });
        section.appendChild(mirrorXToggle.wrapper);

        const mirrorYToggle = createToggleInput({ label: "Mirror Y", checked: this.settings.mirrorY });
        mirrorYToggle.input.addEventListener("change", () => {
            this.settings.mirrorY = mirrorYToggle.input.checked;
            this.emitChange();
        });
        section.appendChild(mirrorYToggle.wrapper);

        const mirrorZToggle = createToggleInput({ label: "Mirror Z", checked: this.settings.mirrorZ });
        mirrorZToggle.input.addEventListener("change", () => {
            this.settings.mirrorZ = mirrorZToggle.input.checked;
            this.emitChange();
        });
        section.appendChild(mirrorZToggle.wrapper);

        const hideBackFacesToggle = createToggleInput({
            label: "Hide back faces",
            checked: this.settings.hideBackFaces,
        });
        hideBackFacesToggle.input.addEventListener("change", () => {
            this.settings.hideBackFaces = hideBackFacesToggle.input.checked;
            this.emitChange();
        });
        section.appendChild(hideBackFacesToggle.wrapper);

        const buttonRow = document.createElement("div");
        buttonRow.className = "voxlab__dropdown-button-row";

        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.textContent = "Clear all paint";
        clearBtn.setAttribute("aria-label", "Clear all painted vertices, restore baseline");
        clearBtn.addEventListener("click", () => {
            this.emit<PaintClearAllEventDetail>("paint-clear-all", { timestamp: Date.now() });
        });
        buttonRow.appendChild(clearBtn);

        const exportBtn = document.createElement("button");
        exportBtn.type = "button";
        exportBtn.textContent = "Export painted mesh";
        exportBtn.setAttribute("aria-label", "Download current mesh with paint baked into vertex colors as JSON");
        exportBtn.addEventListener("click", () => {
            this.emit<{ timestamp: number }>("paint-export", { timestamp: Date.now() });
        });
        buttonRow.appendChild(exportBtn);

        section.appendChild(buttonRow);

        this.inputs = {
            color: colorPicker.input,
            radius: radiusSlider.input,
            falloffSigma: falloffSlider.input,
            opacity: opacitySlider.input,
            paintMode: paintModeToggle.input,
            eyedropper: eyedropperToggle.input,
            mirrorX: mirrorXToggle.input,
            mirrorY: mirrorYToggle.input,
            mirrorZ: mirrorZToggle.input,
            hideBackFaces: hideBackFacesToggle.input,
        };

        return section;
    }

    protected onUnmount(): void {
        if (this.modeDropdown) {
            this.modeDropdown.unmount();
        }
    }

    private emitChange(): void {
        this.emit<BrushChangeEventDetail>("brush-change", { ...this.settings });
    }
}
