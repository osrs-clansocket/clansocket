import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { modalService } from "../../../../managers/voxlab/services/modal-service.js";
import { BUILTIN_ANIMATION_PRESETS } from "../../../../shared/constants/voxlab/builtin-animation-presets-constants.js";
import type {
    AnimationCategory,
    AnimationPresetDefinition,
} from "../../../../shared/types/voxlab/animation-preset-types.js";
import type { SceneSnapshot } from "../../../../shared/types/voxlab/snapshot-types.js";

const APPLY_MODE_KEY = "voxlab.animations.fitTimeline";

export interface AnimationsPanelDeps {
    getSnapshot: () => SceneSnapshot;
    /** Returns the active preset ids currently present on the timeline. */
    getActivePresetIds: () => string[];
    /** Returns timeline.durationMs (0 if no timeline loaded). */
    getTimelineDurationMs: () => number;
    /** Returns the cursor's current ms position. */
    getCursorMs: () => number;
    /** Returns true if a timeline is currently loaded. */
    hasTimeline: () => boolean;
    /** Apply a single preset to the timeline. */
    applyPreset: (preset: AnimationPresetDefinition, durationMs: number, cursorOffsetMs: number) => void;
    /** Remove all keyframes tagged with this preset id. */
    removePreset: (presetId: string) => void;
    /** Subscribe to timeline events so the panel can refresh. */
    addTimelineListener: (type: string, listener: EventListener) => void;
    removeTimelineListener: (type: string, listener: EventListener) => void;
}

const CATEGORIES: AnimationCategory[] = ["Camera", "Material", "Lighting", "Post-FX", "Combo"];

export class AnimationsPanelComponent extends BaseVoxlabComponent {
    private fitToTimeline = true;
    private activeHost!: HTMLElement;
    private listHost!: HTMLElement;
    private fitButton!: HTMLButtonElement;
    private cursorButton!: HTMLButtonElement;

    constructor(private readonly deps: AnimationsPanelDeps) {
        super();
        try {
            const raw = localStorage.getItem(APPLY_MODE_KEY);
            if (raw === "false") {
                this.fitToTimeline = false;
            }
        } catch {
            // ignore
        }
    }

    protected build(): HTMLElement {
        const panel = document.createElement("section");
        panel.className = "voxlab__presets-panel";

        // Mode row: controls HOW per-row Apply runs (fit full timeline vs
        // anchor at cursor with preset's default duration). Apply itself is
        // per-row only — no batch selection.
        const modeRow = document.createElement("div");
        modeRow.style.display = "grid";
        modeRow.style.gridTemplateColumns = "1fr 1fr";
        modeRow.style.gap = "0";

        this.fitButton = this.makeBtn("Fit timeline");
        this.cursorButton = this.makeBtn("At cursor");
        this.fitButton.style.borderRight = "0";

        this.fitButton.addEventListener("click", () => this.setFitMode(true));
        this.cursorButton.addEventListener("click", () => this.setFitMode(false));

        modeRow.appendChild(this.fitButton);
        modeRow.appendChild(this.cursorButton);
        panel.appendChild(modeRow);

        // Active presets
        const activeTitle = document.createElement("div");
        activeTitle.className = "voxlab__presets-group-title";
        activeTitle.textContent = "Active on timeline";
        panel.appendChild(activeTitle);

        this.activeHost = document.createElement("div");
        this.activeHost.className = "voxlab__presets-list";
        panel.appendChild(this.activeHost);

        // Library list
        this.listHost = document.createElement("div");
        this.listHost.className = "voxlab__presets-list";
        panel.appendChild(this.listHost);

        this.refreshModeButtons();
        this.refreshActive();
        this.renderLibrary();

        const onTimelineChange = (): void => {
            this.refreshActive();
            this.refreshModeButtons();
        };
        this.deps.addTimelineListener("timeline-tracks-changed", onTimelineChange);
        this.deps.addTimelineListener("timeline-loaded", onTimelineChange);
        this.deps.addTimelineListener("timeline-unloaded", onTimelineChange);

        return panel;
    }

    private renderLibrary(): void {
        const children: HTMLElement[] = [];
        for (const category of CATEGORIES) {
            const presets = BUILTIN_ANIMATION_PRESETS.filter((p) => p.category === category);
            if (presets.length === 0) {
                continue;
            }
            const title = document.createElement("div");
            title.className = "voxlab__presets-group-title";
            title.textContent = category;
            children.push(title);
            for (const preset of presets) {
                children.push(this.makeRow(preset));
            }
        }
        this.listHost.replaceChildren(...children);
    }

    private makeRow(preset: AnimationPresetDefinition): HTMLElement {
        const row = document.createElement("div");
        row.className = "voxlab__presets-row";

        const name = document.createElement("span");
        name.className = "voxlab__presets-row-name";
        name.textContent = preset.name;
        if (preset.description) {
            name.title = preset.description;
        }

        const actions = document.createElement("div");
        actions.className = "voxlab__presets-row-actions";
        const applyBtn = this.makeBtn("Apply");
        applyBtn.title = `${preset.defaultDurationMs}ms default`;
        applyBtn.addEventListener("click", () => void this.applyOne(preset));
        actions.appendChild(applyBtn);

        row.appendChild(name);
        row.appendChild(actions);
        return row;
    }

    private makeBtn(label: string): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "voxlab__presets-row-btn";
        btn.textContent = label;
        return btn;
    }

    private setFitMode(fit: boolean): void {
        this.fitToTimeline = fit;
        try {
            localStorage.setItem(APPLY_MODE_KEY, fit ? "true" : "false");
        } catch {
            // ignore
        }
        this.refreshModeButtons();
    }

    private refreshModeButtons(): void {
        if (!this.fitButton) return;
        this.fitButton.dataset.active = this.fitToTimeline ? "true" : "false";
        this.cursorButton.dataset.active = !this.fitToTimeline ? "true" : "false";
    }

    private refreshActive(): void {
        if (!this.activeHost) return;
        const ids = this.deps.getActivePresetIds();
        if (ids.length === 0) {
            const empty = document.createElement("div");
            empty.className = "voxlab__actions-empty";
            empty.textContent = "No animation presets on the timeline.";
            this.activeHost.replaceChildren(empty);
            return;
        }
        const rows: HTMLElement[] = [];
        for (const id of ids) {
            const preset = BUILTIN_ANIMATION_PRESETS.find((p) => p.id === id);
            const label = preset ? preset.name : id;
            const row = document.createElement("div");
            row.className = "voxlab__presets-row";
            const name = document.createElement("span");
            name.className = "voxlab__presets-row-name";
            name.textContent = label;
            const actions = document.createElement("div");
            actions.className = "voxlab__presets-row-actions";
            const rm = this.makeBtn("✕");
            rm.title = "Remove this preset's keyframes";
            rm.addEventListener("click", () => void this.confirmRemove(id, label));
            actions.appendChild(rm);
            row.appendChild(name);
            row.appendChild(actions);
            rows.push(row);
        }
        this.activeHost.replaceChildren(...rows);
    }

    private async applyOne(preset: AnimationPresetDefinition): Promise<void> {
        if (!this.deps.hasTimeline()) {
            await modalService.alert("Enable the timeline first (Export tab → Start timeline).");
            return;
        }
        const { durationMs, cursorOffsetMs } = this.computeApplyOptions(preset);
        this.deps.applyPreset(preset, durationMs, cursorOffsetMs);
        this.refreshActive();
    }

    private computeApplyOptions(preset: AnimationPresetDefinition): { durationMs: number; cursorOffsetMs: number } {
        if (this.fitToTimeline) {
            const dur = this.deps.getTimelineDurationMs();
            return { durationMs: dur > 0 ? dur : preset.defaultDurationMs, cursorOffsetMs: 0 };
        }
        return { durationMs: preset.defaultDurationMs, cursorOffsetMs: this.deps.getCursorMs() };
    }

    private async confirmRemove(presetId: string, label: string): Promise<void> {
        const ok = await modalService.confirm(`Remove "${label}" keyframes from the timeline?`, {
            danger: true,
            confirmLabel: "Remove",
        });
        if (ok) {
            this.deps.removePreset(presetId);
            this.refreshActive();
        }
    }
}
