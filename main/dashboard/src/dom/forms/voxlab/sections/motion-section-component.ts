import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { createSliderInput, createToggleInput } from "../../../../voxlab/formatters/control-formatter.js";
import {
    pathNumber,
    pathStep,
    snapshotRegistry,
    type PathSpec,
} from "../../../../state/voxlab/registries/snapshot-registry.js";
import {
    BOB_AMPLITUDE_MAX,
    BREATHE_AMPLITUDE_MAX,
    DEFAULT_MOTION,
    PERIOD_MAX_MS,
    PERIOD_MIN_MS,
    PERIOD_STEP_MS,
    TILT_STRENGTH_MAX,
} from "../../../../shared/constants/voxlab/motion-constants.js";
import type { MotionSettings } from "../../../../shared/types/voxlab/motion-types.js";

const MOTION_PATHS: ReadonlyArray<PathSpec> = [
    pathNumber("breatheAmplitude", "breatheAmplitude"),
    pathNumber("breathePeriodMs", "breathePeriodMs"),
    pathNumber("bobAmplitude", "bobAmplitude"),
    pathNumber("bobPeriodMs", "bobPeriodMs"),
    pathNumber("tiltStrength", "tiltStrength"),
    pathStep("breatheEnabled", "breatheEnabled"),
    pathStep("bobEnabled", "bobEnabled"),
    pathStep("tiltEnabled", "tiltEnabled"),
];

export class MotionSectionComponent extends BaseVoxlabComponent {
    private settings: MotionSettings = { ...DEFAULT_MOTION };

    constructor() {
        super();
        snapshotRegistry.register<MotionSettings>({
            name: "motion",
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths: MOTION_PATHS,
        });
    }
    private inputs!: {
        breatheEnabled: HTMLInputElement;
        breatheAmplitude: HTMLInputElement;
        breathePeriod: HTMLInputElement;
        bobEnabled: HTMLInputElement;
        bobAmplitude: HTMLInputElement;
        bobPeriod: HTMLInputElement;
        tiltEnabled: HTMLInputElement;
        tiltStrength: HTMLInputElement;
    };

    get current(): MotionSettings {
        return { ...this.settings };
    }

    apply(state: MotionSettings, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        this.inputs.breatheEnabled.checked = this.settings.breatheEnabled;
        this.inputs.breatheAmplitude.value = String(this.settings.breatheAmplitude);
        this.inputs.breathePeriod.value = String(this.settings.breathePeriodMs);
        this.inputs.bobEnabled.checked = this.settings.bobEnabled;
        this.inputs.bobAmplitude.value = String(this.settings.bobAmplitude);
        this.inputs.bobPeriod.value = String(this.settings.bobPeriodMs);
        this.inputs.tiltEnabled.checked = this.settings.tiltEnabled;
        this.inputs.tiltStrength.value = String(this.settings.tiltStrength);
        if (!opts?.silent) {
            this.emit<MotionSettings>("motion-change", this.current);
        }
    }

    reset(): void {
        this.settings = { ...DEFAULT_MOTION };
        this.inputs.breatheEnabled.checked = DEFAULT_MOTION.breatheEnabled;
        this.inputs.breatheAmplitude.value = String(DEFAULT_MOTION.breatheAmplitude);
        this.inputs.breathePeriod.value = String(DEFAULT_MOTION.breathePeriodMs);
        this.inputs.bobEnabled.checked = DEFAULT_MOTION.bobEnabled;
        this.inputs.bobAmplitude.value = String(DEFAULT_MOTION.bobAmplitude);
        this.inputs.bobPeriod.value = String(DEFAULT_MOTION.bobPeriodMs);
        this.inputs.tiltEnabled.checked = DEFAULT_MOTION.tiltEnabled;
        this.inputs.tiltStrength.value = String(DEFAULT_MOTION.tiltStrength);
        this.emit<MotionSettings>("motion-change", this.current);
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Motion";
        section.appendChild(heading);

        const breatheEnabled = createToggleInput({ label: "Breathe", checked: DEFAULT_MOTION.breatheEnabled });
        const breatheAmplitude = createSliderInput({
            label: "Breathe amplitude",
            min: 0,
            max: BREATHE_AMPLITUDE_MAX,
            step: 0.005,
            value: DEFAULT_MOTION.breatheAmplitude,
        });
        const breathePeriod = createSliderInput({
            label: "Breathe period (ms)",
            min: PERIOD_MIN_MS,
            max: PERIOD_MAX_MS,
            step: PERIOD_STEP_MS,
            value: DEFAULT_MOTION.breathePeriodMs,
            formatValue: (n) => `${Math.round(n)} ms`,
        });
        const bobEnabled = createToggleInput({ label: "Bob", checked: DEFAULT_MOTION.bobEnabled });
        const bobAmplitude = createSliderInput({
            label: "Bob amplitude",
            min: 0,
            max: BOB_AMPLITUDE_MAX,
            step: 0.005,
            value: DEFAULT_MOTION.bobAmplitude,
        });
        const bobPeriod = createSliderInput({
            label: "Bob period (ms)",
            min: PERIOD_MIN_MS,
            max: PERIOD_MAX_MS,
            step: PERIOD_STEP_MS,
            value: DEFAULT_MOTION.bobPeriodMs,
            formatValue: (n) => `${Math.round(n)} ms`,
        });
        const tiltEnabled = createToggleInput({ label: "Tilt (cursor follow)", checked: DEFAULT_MOTION.tiltEnabled });
        const tiltStrength = createSliderInput({
            label: "Tilt strength",
            min: 0,
            max: TILT_STRENGTH_MAX,
            step: 0.01,
            value: DEFAULT_MOTION.tiltStrength,
        });

        [
            breatheEnabled,
            breatheAmplitude,
            breathePeriod,
            bobEnabled,
            bobAmplitude,
            bobPeriod,
            tiltEnabled,
            tiltStrength,
        ].forEach((c) => section.appendChild(c.wrapper));

        this.inputs = {
            breatheEnabled: breatheEnabled.input,
            breatheAmplitude: breatheAmplitude.input,
            breathePeriod: breathePeriod.input,
            bobEnabled: bobEnabled.input,
            bobAmplitude: bobAmplitude.input,
            bobPeriod: bobPeriod.input,
            tiltEnabled: tiltEnabled.input,
            tiltStrength: tiltStrength.input,
        };
        this.wireInputs();
        return section;
    }

    private wireInputs(): void {
        const emitChange = (): void => this.emit<MotionSettings>("motion-change", this.current);
        this.inputs.breatheEnabled.addEventListener("change", () => {
            this.settings.breatheEnabled = this.inputs.breatheEnabled.checked;
            emitChange();
        });
        this.inputs.breatheAmplitude.addEventListener("input", () => {
            this.settings.breatheAmplitude = Number.parseFloat(this.inputs.breatheAmplitude.value);
            emitChange();
        });
        this.inputs.breathePeriod.addEventListener("input", () => {
            this.settings.breathePeriodMs = Number.parseFloat(this.inputs.breathePeriod.value);
            emitChange();
        });
        this.inputs.bobEnabled.addEventListener("change", () => {
            this.settings.bobEnabled = this.inputs.bobEnabled.checked;
            emitChange();
        });
        this.inputs.bobAmplitude.addEventListener("input", () => {
            this.settings.bobAmplitude = Number.parseFloat(this.inputs.bobAmplitude.value);
            emitChange();
        });
        this.inputs.bobPeriod.addEventListener("input", () => {
            this.settings.bobPeriodMs = Number.parseFloat(this.inputs.bobPeriod.value);
            emitChange();
        });
        this.inputs.tiltEnabled.addEventListener("change", () => {
            this.settings.tiltEnabled = this.inputs.tiltEnabled.checked;
            emitChange();
        });
        this.inputs.tiltStrength.addEventListener("input", () => {
            this.settings.tiltStrength = Number.parseFloat(this.inputs.tiltStrength.value);
            emitChange();
        });
    }
}
