import { BaseVoxlabComponent } from "../../../../../managers/voxlab/base/base-voxlab-component.js";
import { createColorInput } from "../../../../../voxlab/formatters/control-formatter.js";
import {
    pathColor,
    snapshotRegistry,
    type PathSpec,
} from "../../../../../state/voxlab/registries/snapshot-registry.js";
import { DEFAULT_PARTS_SECTION_STATE } from "../../../../../shared/constants/voxlab/texture-paint-constants.js";
import type {
    MeshPart,
    PartsFillEventDetail,
    PartsResetEventDetail,
    PartsSectionState,
} from "../../../../../shared/types/voxlab/paint-types.js";

const PARTS_SECTION_PATHS: ReadonlyArray<PathSpec> = [pathColor("color", "color")];

export class PartsSection extends BaseVoxlabComponent {
    private settings: PartsSectionState = { ...DEFAULT_PARTS_SECTION_STATE };
    private colorInput!: HTMLInputElement;

    constructor() {
        super();
        snapshotRegistry.register<PartsSectionState>({
            name: "partsSection",
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths: PARTS_SECTION_PATHS,
        });
    }

    get current(): PartsSectionState {
        return { ...this.settings };
    }

    apply(state: PartsSectionState, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        if (this.colorInput) {
            this.colorInput.value = this.settings.color;
        }
        if (!opts?.silent) {
            this.emit<PartsSectionState>("parts-section-change", this.current);
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_PARTS_SECTION_STATE });
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Parts";
        section.appendChild(heading);

        const colorPicker = createColorInput({
            label: "Color",
            value: this.settings.color,
        });
        colorPicker.input.addEventListener("input", () => {
            this.settings.color = colorPicker.input.value;
            this.emit<PartsSectionState>("parts-section-change", this.current);
        });
        section.appendChild(colorPicker.wrapper);
        this.colorInput = colorPicker.input;

        section.appendChild(this.makePartRow("Front", "front"));
        section.appendChild(this.makePartRow("Back", "back"));
        section.appendChild(this.makePartRow("Sides", "sides"));

        return section;
    }

    private makePartRow(label: string, part: MeshPart): HTMLElement {
        const row = document.createElement("div");
        row.className = "voxlab__dropdown-button-row";

        const fillBtn = document.createElement("button");
        fillBtn.type = "button";
        fillBtn.textContent = `Fill ${label}`;
        fillBtn.setAttribute("aria-label", `Fill ${label} with current color`);
        fillBtn.addEventListener("click", () => {
            this.emit<PartsFillEventDetail>("parts-fill", { part, color: this.settings.color });
        });
        row.appendChild(fillBtn);

        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.textContent = `Reset ${label}`;
        resetBtn.setAttribute("aria-label", `Reset ${label} to source-derived colors`);
        resetBtn.addEventListener("click", () => {
            this.emit<PartsResetEventDetail>("parts-reset", { part });
        });
        row.appendChild(resetBtn);

        return row;
    }
}
