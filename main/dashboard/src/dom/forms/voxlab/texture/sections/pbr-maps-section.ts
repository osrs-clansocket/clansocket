import { BaseVoxlabComponent } from "../../../../../managers/voxlab/base/base-voxlab-component.js";
import { createSliderInput } from "../../../../../voxlab/formatters/control-formatter.js";
import { createFilePicker, type FilePickerHandle } from "../../../glass/inputs/glass-file.js";
import { downsampleDataUrlIfNeeded } from "../../../../../voxlab/mappers/downsample-mapper.js";
import {
    DEFAULT_PBR_MAPS_SETTINGS,
    MAX_UPLOAD_TEXTURE_DIM,
    PBR_INTENSITY_MAX,
    PBR_INTENSITY_MIN,
    PBR_INTENSITY_STEP,
    PBR_NORMAL_SCALE_MAX,
    PBR_NORMAL_SCALE_MIN,
    PBR_NORMAL_SCALE_STEP,
    PBR_SLOT_ORDER,
} from "../../../../../shared/constants/voxlab/texture-paint-constants.js";
import { snapshotRegistry } from "../../../../../state/voxlab/registries/snapshot-registry.js";
import type {
    PbrMapSlot,
    PbrMapsChangeEventDetail,
    PbrMapsSettings,
} from "../../../../../shared/types/voxlab/paint-types.js";

const SLOT_LABELS: Record<PbrMapSlot, string> = {
    normal: "Normal map",
    roughness: "Roughness map",
    metalness: "Metalness map",
    ao: "Ambient occlusion map",
};

type IntensityKey = "normalScale" | "roughnessIntensity" | "metalnessIntensity" | "aoIntensity";

const INTENSITY_TO_SLOT: Record<IntensityKey, PbrMapSlot> = {
    normalScale: "normal",
    roughnessIntensity: "roughness",
    metalnessIntensity: "metalness",
    aoIntensity: "ao",
};

const SLOT_HUMAN_LABELS: Record<PbrMapSlot, string> = {
    normal: "normal",
    roughness: "roughness",
    metalness: "metalness",
    ao: "AO",
};

export class PbrMapsSection extends BaseVoxlabComponent {
    private settings: PbrMapsSettings = { ...DEFAULT_PBR_MAPS_SETTINGS };
    private pickers: Partial<Record<PbrMapSlot, FilePickerHandle>> = {};
    private intensityInputs: Partial<Record<IntensityKey, HTMLInputElement>> = {};

    constructor() {
        super();
        snapshotRegistry.register<PbrMapsSettings>({
            name: "pbrMaps",
            getState: () => ({ ...this.settings }),
            applyState: (state, opts) => this.apply(state, opts),
            paths: [],
        });
    }

    get current(): PbrMapsSettings {
        return { ...this.settings };
    }

    apply(state: PbrMapsSettings, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        if (this.intensityInputs.normalScale) {
            this.intensityInputs.normalScale.value = String(this.settings.normalScale);
        }
        if (this.intensityInputs.roughnessIntensity) {
            this.intensityInputs.roughnessIntensity.value = String(this.settings.roughnessIntensity);
        }
        if (this.intensityInputs.metalnessIntensity) {
            this.intensityInputs.metalnessIntensity.value = String(this.settings.metalnessIntensity);
        }
        if (this.intensityInputs.aoIntensity) {
            this.intensityInputs.aoIntensity.value = String(this.settings.aoIntensity);
        }
        this.updateSliderEnabledStates();
        if (!opts?.silent) {
            this.emit<PbrMapsChangeEventDetail>("pbr-maps-change", { ...this.settings });
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_PBR_MAPS_SETTINGS });
        for (const slot of PBR_SLOT_ORDER) {
            this.pickers[slot]?.clear();
        }
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "PBR maps";
        section.appendChild(heading);

        for (const slot of PBR_SLOT_ORDER) {
            this.appendSlot(section, slot);
        }

        section.appendChild(
            this.buildIntensitySlider(
                "normalScale",
                "Normal scale",
                PBR_NORMAL_SCALE_MIN,
                PBR_NORMAL_SCALE_MAX,
                PBR_NORMAL_SCALE_STEP,
            ),
        );
        section.appendChild(
            this.buildIntensitySlider(
                "roughnessIntensity",
                "Roughness intensity",
                PBR_INTENSITY_MIN,
                PBR_INTENSITY_MAX,
                PBR_INTENSITY_STEP,
            ),
        );
        section.appendChild(
            this.buildIntensitySlider(
                "metalnessIntensity",
                "Metalness intensity",
                PBR_INTENSITY_MIN,
                PBR_INTENSITY_MAX,
                PBR_INTENSITY_STEP,
            ),
        );
        section.appendChild(
            this.buildIntensitySlider(
                "aoIntensity",
                "AO intensity",
                PBR_INTENSITY_MIN,
                PBR_INTENSITY_MAX,
                PBR_INTENSITY_STEP,
            ),
        );

        this.updateSliderEnabledStates();
        return section;
    }

    private buildIntensitySlider(
        key: IntensityKey,
        label: string,
        min: number,
        max: number,
        step: number,
    ): HTMLElement {
        const slider = createSliderInput({
            label,
            min,
            max,
            step,
            value: this.settings[key],
            formatValue: (n) => n.toFixed(2),
        });
        slider.input.addEventListener("input", () => {
            this.settings[key] = Number.parseFloat(slider.input.value);
            this.emit<PbrMapsChangeEventDetail>("pbr-maps-change", { ...this.settings });
        });
        this.intensityInputs[key] = slider.input;
        return slider.wrapper;
    }

    private appendSlot(section: HTMLElement, slot: PbrMapSlot): void {
        const picker = createFilePicker({
            label: SLOT_LABELS[slot],
            accept: "image/*",
            ariaLabel: `Upload ${SLOT_LABELS[slot]}`,
        });
        picker.input.addEventListener("change", () => {
            const file = picker.getCurrent();
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                const result = reader.result;
                if (typeof result !== "string") {
                    return;
                }
                void downsampleDataUrlIfNeeded(result, MAX_UPLOAD_TEXTURE_DIM).then((capped) => {
                    this.settings[slot] = capped;
                    this.updateSliderEnabledStates();
                    this.emit<PbrMapsChangeEventDetail>("pbr-maps-change", { ...this.settings });
                });
            });
            reader.readAsDataURL(file);
        });
        this.pickers[slot] = picker;
        section.appendChild(picker.wrapper);

        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "voxlab__dropdown-btn-primary";
        clearBtn.textContent = `Clear ${slot}`;
        clearBtn.setAttribute("aria-label", `Clear ${SLOT_LABELS[slot]}`);
        clearBtn.addEventListener("click", () => {
            this.settings[slot] = null;
            picker.clear();
            this.updateSliderEnabledStates();
            this.emit<PbrMapsChangeEventDetail>("pbr-maps-change", { ...this.settings });
        });
        section.appendChild(clearBtn);
    }

    private updateSliderEnabledStates(): void {
        for (const key of Object.keys(INTENSITY_TO_SLOT) as IntensityKey[]) {
            const slider = this.intensityInputs[key];
            if (!slider) {
                continue;
            }
            const slot = INTENSITY_TO_SLOT[key];
            const hasMap = this.settings[slot] !== null;
            slider.disabled = !hasMap;
            // Title doubles as hover tooltip + screen-reader hint, explaining
            // WHY the slider is inert rather than letting users wonder if it's
            // a wiring bug (which is exactly what the user just reported).
            slider.title = hasMap ? "" : `Upload a ${SLOT_HUMAN_LABELS[slot]} map first to enable this slider`;
        }
    }
}
