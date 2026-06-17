import { BaseVoxlabComponent } from "../../../../../managers/voxlab/base/base-voxlab-component.js";
import { createColorInput, createSliderInput } from "../../../../../voxlab/formatters/control-formatter.js";
import { DEFAULT_GRADIENT_SPEC } from "../../../../../shared/constants/voxlab/texture-paint-constants.js";
import { snapshotRegistry } from "../../../../../state/voxlab/registries/snapshot-registry.js";
import type {
    GradientApplyEventDetail,
    GradientAxis,
    GradientSpec,
    GradientTarget,
    GradientType,
} from "../../../../../shared/types/voxlab/paint-types.js";
import { DropdownComponent, type DropdownChangeDetail } from "../../panels/dropdown-component.js";

const POSITION_SLIDER_MIN = 0;
const POSITION_SLIDER_MAX = 1;
const POSITION_SLIDER_STEP = 0.01;
const MIDPOINT_POSITION = 0.5;
const NEW_STOP_COLOR = "#888888";

export class GradientSection extends BaseVoxlabComponent {
    private settings: GradientSpec = cloneSpec(DEFAULT_GRADIENT_SPEC);
    private stopsHost: HTMLElement | null = null;
    private typeDropdown!: DropdownComponent<GradientType>;
    private axisDropdown!: DropdownComponent<GradientAxis>;
    private targetDropdown!: DropdownComponent<GradientTarget>;

    constructor() {
        super();
        snapshotRegistry.register<GradientSpec>({
            name: "gradient",
            getState: () => cloneSpec(this.settings),
            applyState: (state) => {
                this.settings = cloneSpec(state);
                this.rebuildStops();
                if (this.typeDropdown) {
                    this.typeDropdown.select(this.settings.type);
                }
                if (this.axisDropdown) {
                    this.axisDropdown.select(this.settings.axis);
                }
                if (this.targetDropdown) {
                    this.targetDropdown.select(this.settings.target);
                }
            },
            paths: [],
        });
    }

    get current(): GradientSpec {
        return cloneSpec(this.settings);
    }

    reset(): void {
        this.settings = cloneSpec(DEFAULT_GRADIENT_SPEC);
        this.rebuildStops();
        if (this.typeDropdown) {
            this.typeDropdown.select(this.settings.type);
        }
        if (this.axisDropdown) {
            this.axisDropdown.select(this.settings.axis);
        }
        if (this.targetDropdown) {
            this.targetDropdown.select(this.settings.target);
        }
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Gradient";
        section.appendChild(heading);

        this.stopsHost = document.createElement("div");
        section.appendChild(this.stopsHost);
        this.rebuildStops();

        const addStopBtn = document.createElement("button");
        addStopBtn.type = "button";
        addStopBtn.className = "voxlab__dropdown-btn-primary";
        addStopBtn.textContent = "Add stop";
        addStopBtn.setAttribute("aria-label", "Add a new gradient color stop at midpoint");
        addStopBtn.addEventListener("click", () => {
            this.settings.stops.push({ color: NEW_STOP_COLOR, position: MIDPOINT_POSITION });
            this.rebuildStops();
            this.emitChange();
        });
        section.appendChild(addStopBtn);

        this.typeDropdown = new DropdownComponent<GradientType>(
            [
                { value: "linear", label: "Linear" },
                { value: "radial", label: "Radial" },
            ],
            this.settings.type,
        );
        this.typeDropdown.mount(section);
        this.typeDropdown.addEventListener("change", (e) => {
            this.settings.type = (e as CustomEvent<DropdownChangeDetail<GradientType>>).detail.value;
            this.emitChange();
        });

        this.axisDropdown = new DropdownComponent<GradientAxis>(
            [
                { value: "x", label: "X axis (linear)" },
                { value: "y", label: "Y axis (linear)" },
                { value: "z", label: "Z axis (linear)" },
            ],
            this.settings.axis,
        );
        this.axisDropdown.mount(section);
        this.axisDropdown.addEventListener("change", (e) => {
            this.settings.axis = (e as CustomEvent<DropdownChangeDetail<GradientAxis>>).detail.value;
            this.emitChange();
        });

        this.targetDropdown = new DropdownComponent<GradientTarget>(
            [
                { value: "all", label: "Target: All" },
                { value: "front", label: "Target: Front" },
                { value: "back", label: "Target: Back" },
                { value: "sides", label: "Target: Sides" },
            ],
            this.settings.target,
        );
        this.targetDropdown.mount(section);
        this.targetDropdown.addEventListener("change", (e) => {
            this.settings.target = (e as CustomEvent<DropdownChangeDetail<GradientTarget>>).detail.value;
            this.emitChange();
        });

        const applyBtn = document.createElement("button");
        applyBtn.type = "button";
        applyBtn.className = "voxlab__dropdown-btn-primary";
        applyBtn.textContent = "Apply gradient";
        applyBtn.setAttribute("aria-label", "Apply current gradient to target vertices");
        applyBtn.addEventListener("click", () => {
            this.emit<GradientApplyEventDetail>("gradient-apply", cloneSpec(this.settings));
        });
        section.appendChild(applyBtn);

        return section;
    }

    protected onUnmount(): void {
        if (this.typeDropdown) {
            this.typeDropdown.unmount();
        }
        if (this.axisDropdown) {
            this.axisDropdown.unmount();
        }
        if (this.targetDropdown) {
            this.targetDropdown.unmount();
        }
    }

    private emitChange(): void {
        this.emit<GradientSpec>("gradient-change", cloneSpec(this.settings));
    }

    private rebuildStops(): void {
        if (!this.stopsHost) {
            return;
        }
        this.stopsHost.textContent = "";
        for (let i = 0; i < this.settings.stops.length; i++) {
            this.stopsHost.appendChild(this.buildStopRow(i));
        }
    }

    private buildStopRow(index: number): HTMLElement {
        const row = document.createElement("div");
        const stop = this.settings.stops[index];

        const colorPicker = createColorInput({
            label: `Stop ${index + 1} color`,
            value: stop.color,
        });
        colorPicker.input.addEventListener("input", () => {
            this.settings.stops[index].color = colorPicker.input.value;
            this.emitChange();
        });
        row.appendChild(colorPicker.wrapper);

        const positionSlider = createSliderInput({
            label: `Stop ${index + 1} position`,
            min: POSITION_SLIDER_MIN,
            max: POSITION_SLIDER_MAX,
            step: POSITION_SLIDER_STEP,
            value: stop.position,
            formatValue: (n) => n.toFixed(2),
        });
        positionSlider.input.addEventListener("input", () => {
            this.settings.stops[index].position = Number.parseFloat(positionSlider.input.value);
            this.emitChange();
        });
        row.appendChild(positionSlider.wrapper);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "voxlab__dropdown-btn-primary";
        removeBtn.textContent = `Remove stop ${index + 1}`;
        removeBtn.setAttribute("aria-label", `Remove stop ${index + 1}`);
        removeBtn.addEventListener("click", () => {
            this.settings.stops.splice(index, 1);
            this.rebuildStops();
            this.emitChange();
        });
        row.appendChild(removeBtn);

        return row;
    }
}

function cloneSpec(spec: GradientSpec): GradientSpec {
    return {
        stops: spec.stops.map((s) => ({ color: s.color, position: s.position })),
        type: spec.type,
        axis: spec.axis,
        target: spec.target,
    };
}
