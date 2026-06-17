import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { DropdownComponent, type DropdownChangeDetail } from "../panels/dropdown-component.js";
import { pathStep, snapshotRegistry, type PathSpec } from "../../../../state/voxlab/registries/snapshot-registry.js";
import { TARGET_FPS_OPTIONS } from "../../../../shared/constants/voxlab/effect-constants.js";
import type { TargetFpsFields } from "./split-sections.js";

const DEFAULT_TARGET_FPS: TargetFpsFields = { targetFps: 0 };

const TARGET_FPS_PATHS: ReadonlyArray<PathSpec> = [pathStep("targetFps", "targetFps")];

/**
 * Target FPS section — uses the standard DropdownComponent for the selector,
 * plus a live readout of the actual measured FPS the renderer is achieving.
 * Voxlab-app-manager bridges viewport's `fps-update` event into this
 * section's `updateRealtimeFps` method.
 */
export class TargetFpsSectionComponent extends BaseVoxlabComponent {
    private settings: TargetFpsFields = { ...DEFAULT_TARGET_FPS };
    private dropdown!: DropdownComponent<string>;
    private fpsLabel!: HTMLElement;

    constructor() {
        super();
        snapshotRegistry.register<TargetFpsFields>({
            name: "targetFps",
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths: TARGET_FPS_PATHS,
        });
    }

    get current(): TargetFpsFields {
        return { ...this.settings };
    }

    apply(state: TargetFpsFields, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        if (this.dropdown) {
            this.dropdown.select(String(this.settings.targetFps));
        }
        if (!opts?.silent) {
            this.emit<TargetFpsFields>("target-fps-change", this.current);
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_TARGET_FPS });
    }

    /** Called by voxlab-app-manager when viewport emits fps-update. */
    updateRealtimeFps(fps: number): void {
        if (!this.fpsLabel) {
            return;
        }
        this.fpsLabel.textContent = `${Math.round(fps)} fps`;
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";

        // Heading row — "Target FPS" + live FPS readout inline on the same
        // line, label-style. Dropdown gets its own row below at full width.
        const headingRow = document.createElement("div");
        headingRow.style.alignItems = "baseline";
        headingRow.style.display = "flex";
        headingRow.style.justifyContent = "space-between";

        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.style.margin = "0";
        heading.textContent = "Target FPS";
        headingRow.appendChild(heading);

        this.fpsLabel = document.createElement("span");
        this.fpsLabel.style.color = "var(--gold)";
        this.fpsLabel.style.fontSize = "0.65rem";
        this.fpsLabel.style.fontVariantNumeric = "tabular-nums";
        this.fpsLabel.textContent = "— fps";
        headingRow.appendChild(this.fpsLabel);

        section.appendChild(headingRow);

        // Dropdown spans full width using the standard "--banner" modifier
        // (negative horizontal margin + width: calc(100% + 1.2rem) + the
        // banner trigger style). Matches every other dropdown in voxlab
        // (SectionComponent passes the same modifier on line 158).
        this.dropdown = new DropdownComponent<string>(
            TARGET_FPS_OPTIONS,
            String(this.settings.targetFps),
            "voxlab__dropdown--banner",
        );
        this.dropdown.mount(section);
        this.dropdown.addEventListener("change", (e) => {
            const detail = (e as CustomEvent<DropdownChangeDetail<string>>).detail;
            this.settings.targetFps = Number.parseInt(detail.value, 10);
            this.emit<TargetFpsFields>("target-fps-change", this.current);
        });

        return section;
    }
}
