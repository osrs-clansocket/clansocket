import { BaseVoxlabComponent } from "../../../../../managers/voxlab/base/base-voxlab-component.js";
import { createSliderInput, createToggleInput } from "../../../../../voxlab/formatters/control-formatter.js";
import {
    AO_RADIUS_MAX,
    AO_RADIUS_MIN,
    AO_RADIUS_STEP,
    DEFAULT_AO_RADIUS,
    DEFAULT_METALNESS_THRESHOLD,
    DEFAULT_PBR_GENERATION_CHANNELS,
    DEFAULT_SOBEL_STRENGTH,
    METALNESS_THRESHOLD_MAX,
    METALNESS_THRESHOLD_MIN,
    METALNESS_THRESHOLD_STEP,
    SOBEL_STRENGTH_MAX,
    SOBEL_STRENGTH_MIN,
    SOBEL_STRENGTH_STEP,
} from "../../../../../shared/constants/voxlab/pbr-generation-constants.js";
import { snapshotRegistry } from "../../../../../state/voxlab/registries/snapshot-registry.js";
import type { PbrGenerateEventDetail } from "../../../../../shared/types/voxlab/paint-types.js";

const DEFAULT_PBR_GENERATE_SETTINGS: PbrGenerateEventDetail = {
    ...DEFAULT_PBR_GENERATION_CHANNELS,
    sobelStrength: DEFAULT_SOBEL_STRENGTH,
    metalnessThreshold: DEFAULT_METALNESS_THRESHOLD,
    aoRadius: DEFAULT_AO_RADIUS,
};

type ChannelKey = "normal" | "roughness" | "metalness" | "ao";

export class PbrGenerationSection extends BaseVoxlabComponent {
    private settings: PbrGenerateEventDetail = { ...DEFAULT_PBR_GENERATE_SETTINGS };
    private inputs!: {
        normal: HTMLInputElement;
        roughness: HTMLInputElement;
        metalness: HTMLInputElement;
        ao: HTMLInputElement;
        sobelStrength: HTMLInputElement;
        metalnessThreshold: HTMLInputElement;
        aoRadius: HTMLInputElement;
    };

    constructor() {
        super();
        snapshotRegistry.register<PbrGenerateEventDetail>({
            name: "pbrGenerationChannels",
            getState: () => ({ ...this.settings }),
            applyState: (state) => this.apply(state),
            paths: [],
        });
    }

    get current(): PbrGenerateEventDetail {
        return { ...this.settings };
    }

    apply(state: PbrGenerateEventDetail): void {
        this.settings = { ...state };
        if (this.inputs) {
            this.inputs.normal.checked = this.settings.normal;
            this.inputs.roughness.checked = this.settings.roughness;
            this.inputs.metalness.checked = this.settings.metalness;
            this.inputs.ao.checked = this.settings.ao;
            this.inputs.sobelStrength.value = String(this.settings.sobelStrength);
            this.inputs.metalnessThreshold.value = String(this.settings.metalnessThreshold);
            this.inputs.aoRadius.value = String(this.settings.aoRadius);
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_PBR_GENERATE_SETTINGS });
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "PBR generation";
        section.appendChild(heading);

        const normalToggle = this.makeChannelToggle("Derive normal", "normal");
        section.appendChild(normalToggle.wrapper);
        const roughnessToggle = this.makeChannelToggle("Derive roughness", "roughness");
        section.appendChild(roughnessToggle.wrapper);
        const metalnessToggle = this.makeChannelToggle("Derive metalness", "metalness");
        section.appendChild(metalnessToggle.wrapper);
        const aoToggle = this.makeChannelToggle("Derive AO", "ao");
        section.appendChild(aoToggle.wrapper);

        const sobelSlider = createSliderInput({
            label: "Sobel strength (normal)",
            min: SOBEL_STRENGTH_MIN,
            max: SOBEL_STRENGTH_MAX,
            step: SOBEL_STRENGTH_STEP,
            value: this.settings.sobelStrength,
            formatValue: (n) => n.toFixed(1),
        });
        sobelSlider.input.addEventListener("input", () => {
            this.settings.sobelStrength = Number.parseFloat(sobelSlider.input.value);
            this.emitChange();
        });
        section.appendChild(sobelSlider.wrapper);

        const thresholdSlider = createSliderInput({
            label: "Metalness threshold",
            min: METALNESS_THRESHOLD_MIN,
            max: METALNESS_THRESHOLD_MAX,
            step: METALNESS_THRESHOLD_STEP,
            value: this.settings.metalnessThreshold,
            formatValue: (n) => n.toFixed(2),
        });
        thresholdSlider.input.addEventListener("input", () => {
            this.settings.metalnessThreshold = Number.parseFloat(thresholdSlider.input.value);
            this.emitChange();
        });
        section.appendChild(thresholdSlider.wrapper);

        const aoSlider = createSliderInput({
            label: "AO radius",
            min: AO_RADIUS_MIN,
            max: AO_RADIUS_MAX,
            step: AO_RADIUS_STEP,
            value: this.settings.aoRadius,
            formatValue: (n) => `${Math.round(n)}`,
        });
        aoSlider.input.addEventListener("input", () => {
            this.settings.aoRadius = Number.parseFloat(aoSlider.input.value);
            this.emitChange();
        });
        section.appendChild(aoSlider.wrapper);

        this.inputs = {
            normal: normalToggle.input,
            roughness: roughnessToggle.input,
            metalness: metalnessToggle.input,
            ao: aoToggle.input,
            sobelStrength: sobelSlider.input,
            metalnessThreshold: thresholdSlider.input,
            aoRadius: aoSlider.input,
        };

        const generateBtn = document.createElement("button");
        generateBtn.type = "button";
        generateBtn.className = "voxlab__dropdown-btn-primary";
        generateBtn.textContent = "Generate PBR from albedo";
        generateBtn.setAttribute("aria-label", "Generate selected PBR maps from current albedo");
        generateBtn.addEventListener("click", () => {
            this.emit<PbrGenerateEventDetail>("pbr-generate", { ...this.settings });
        });
        section.appendChild(generateBtn);

        return section;
    }

    private makeChannelToggle(labelText: string, key: ChannelKey): { wrapper: HTMLElement; input: HTMLInputElement } {
        const toggle = createToggleInput({ label: labelText, checked: this.settings[key] });
        toggle.input.addEventListener("change", () => {
            this.settings[key] = toggle.input.checked;
            this.emitChange();
        });
        return toggle;
    }

    private emitChange(): void {
        this.emit<PbrGenerateEventDetail>("pbr-generation-change", { ...this.settings });
    }
}
