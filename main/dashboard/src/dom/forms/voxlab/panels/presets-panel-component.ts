import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { modalService } from "../../../../managers/voxlab/services/modal-service.js";
import type { PresetStorageService, UserPreset } from "../../../../managers/voxlab/services/preset-storage-service.js";
import { BUILTIN_PRESETS, type BuiltinPreset } from "../../../../shared/constants/voxlab/builtin-presets-constants.js";
import type { SceneSnapshot } from "../../../../shared/types/voxlab/snapshot-types.js";

export interface PresetApplyDetail {
    snapshot: SceneSnapshot;
    name: string;
    source: "builtin" | "user";
}

export interface PresetsPanelDeps {
    storage: PresetStorageService;
    onApply: (detail: PresetApplyDetail) => void;
    onSaveCurrent: () => SceneSnapshot;
}

export class PresetsPanelComponent extends BaseVoxlabComponent {
    private listHost!: HTMLElement;
    private userPresets: UserPreset[] = [];

    constructor(private readonly deps: PresetsPanelDeps) {
        super();
    }

    protected build(): HTMLElement {
        const panel = document.createElement("section");
        panel.className = "voxlab__presets-panel";

        const actions = document.createElement("div");
        actions.className = "voxlab__sidebar-panel-action-row";
        actions.style.display = "grid";
        actions.style.gridTemplateColumns = "1fr 1fr 1fr";
        actions.style.gap = "0";

        const importBtn = this.makeRowBtn("Import");
        const exportBtn = this.makeRowBtn("Export");
        const saveBtn = this.makeRowBtn("Save");
        importBtn.style.borderRight = "0";
        exportBtn.style.borderRight = "0";

        importBtn.addEventListener("click", () => this.importPreset());
        exportBtn.addEventListener("click", () => this.exportCurrent());
        saveBtn.addEventListener("click", () => void this.saveCurrent());

        actions.appendChild(importBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(saveBtn);
        panel.appendChild(actions);

        this.listHost = document.createElement("div");
        this.listHost.className = "voxlab__presets-list";
        panel.appendChild(this.listHost);

        void this.refresh();
        return panel;
    }

    async refresh(): Promise<void> {
        this.userPresets = await this.deps.storage.list();
        this.render();
    }

    private render(): void {
        const builtinTitle = document.createElement("div");
        builtinTitle.className = "voxlab__presets-group-title";
        builtinTitle.textContent = "Built-in";

        const userTitle = document.createElement("div");
        userTitle.className = "voxlab__presets-group-title";
        userTitle.textContent = `Yours${this.userPresets.length ? ` (${this.userPresets.length})` : ""}`;

        const children: HTMLElement[] = [builtinTitle];
        for (const builtin of BUILTIN_PRESETS) {
            children.push(this.makeBuiltinRow(builtin));
        }
        children.push(userTitle);
        if (this.userPresets.length === 0) {
            const empty = document.createElement("div");
            empty.className = "voxlab__presets-empty";
            empty.textContent = "No presets saved yet";
            children.push(empty);
        } else {
            const sorted = [...this.userPresets].sort((a, b) => b.createdAt - a.createdAt);
            for (const user of sorted) {
                children.push(this.makeUserRow(user));
            }
        }
        this.listHost.replaceChildren(...children);
    }

    private makeBuiltinRow(preset: BuiltinPreset): HTMLElement {
        const row = document.createElement("div");
        row.className = "voxlab__presets-row";
        const name = document.createElement("span");
        name.className = "voxlab__presets-row-name";
        name.textContent = preset.name;
        const actions = document.createElement("div");
        actions.className = "voxlab__presets-row-actions";
        const loadBtn = this.makeRowBtn("Load");
        loadBtn.addEventListener("click", () => {
            this.deps.onApply({ snapshot: preset.snapshot, name: preset.name, source: "builtin" });
        });
        const exportBtn = this.makeRowBtn("⇩");
        exportBtn.title = "Export this preset";
        exportBtn.addEventListener("click", () => this.exportSnapshot(preset.snapshot, preset.id));
        actions.appendChild(loadBtn);
        actions.appendChild(exportBtn);
        row.appendChild(name);
        row.appendChild(actions);
        return row;
    }

    private makeUserRow(preset: UserPreset): HTMLElement {
        const row = document.createElement("div");
        row.className = "voxlab__presets-row";
        const name = document.createElement("span");
        name.className = "voxlab__presets-row-name";
        name.textContent = preset.name;
        const actions = document.createElement("div");
        actions.className = "voxlab__presets-row-actions";
        const loadBtn = this.makeRowBtn("Load");
        loadBtn.addEventListener("click", () => {
            this.deps.onApply({ snapshot: preset.snapshot, name: preset.name, source: "user" });
        });
        const exportBtn = this.makeRowBtn("⇩");
        exportBtn.title = "Export this preset";
        exportBtn.addEventListener("click", () => this.exportSnapshot(preset.snapshot, preset.id));
        const deleteBtn = this.makeRowBtn("✕");
        deleteBtn.title = "Delete preset";
        deleteBtn.addEventListener("click", () => void this.deletePreset(preset.id));
        actions.appendChild(loadBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(deleteBtn);
        row.appendChild(name);
        row.appendChild(actions);
        return row;
    }

    private makeRowBtn(label: string): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "voxlab__presets-row-btn";
        btn.textContent = label;
        return btn;
    }

    private importPreset(): void {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) {
                return;
            }
            try {
                const text = await file.text();
                const snapshot = this.deps.storage.deserialize(text);
                const proposed = await modalService.prompt("Name this preset:", file.name.replace(/\.json$/i, ""));
                if (!proposed) {
                    return;
                }
                const preset: UserPreset = {
                    id: `user-${performance.now().toString(36)}`,
                    name: proposed,
                    snapshot,
                    createdAt: performance.now(),
                };
                await this.deps.storage.save(preset);
                await this.refresh();
            } catch (err) {
                await modalService.alert(
                    `Could not import preset: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        });
        input.click();
    }

    private exportCurrent(): void {
        const snapshot = this.deps.onSaveCurrent();
        this.exportSnapshot(snapshot, "current");
    }

    private exportSnapshot(snapshot: SceneSnapshot, fileStem: string): void {
        const text = this.deps.storage.serialize(snapshot);
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `voxlab-preset-${fileStem}.json`;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }

    private async saveCurrent(): Promise<void> {
        const proposed = await modalService.prompt("Name this preset:", "My preset");
        if (!proposed) {
            return;
        }
        const snapshot = this.deps.onSaveCurrent();
        const preset: UserPreset = {
            id: `user-${performance.now().toString(36)}`,
            name: proposed,
            snapshot,
            createdAt: performance.now(),
        };
        await this.deps.storage.save(preset);
        await this.refresh();
    }

    private async deletePreset(id: string): Promise<void> {
        const ok = await modalService.confirm("Delete this preset?", { danger: true, confirmLabel: "Delete" });
        if (!ok) {
            return;
        }
        await this.deps.storage.remove(id);
        await this.refresh();
    }
}
