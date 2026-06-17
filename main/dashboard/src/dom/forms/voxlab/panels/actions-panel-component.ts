import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import type {
    ChangedSetting,
    HistoryEntry,
    HistoryService,
} from "../../../../managers/voxlab/services/history-service.js";
import { modalService } from "../../../../managers/voxlab/services/modal-service.js";
import type { SceneSnapshot } from "../../../../shared/types/voxlab/snapshot-types.js";

export interface ActionsPanelDeps {
    history: HistoryService;
    getSnapshot: () => SceneSnapshot;
    onUndo: () => void;
    onRedo: () => void;
    onResetPath: (path: string) => void;
    onClearAll: () => void;
}

export class ActionsPanelComponent extends BaseVoxlabComponent {
    private undoBtn!: HTMLButtonElement;
    private redoBtn!: HTMLButtonElement;
    private clearBtn!: HTMLButtonElement;
    private listHost!: HTMLElement;

    constructor(private readonly deps: ActionsPanelDeps) {
        super();
        this.deps.history.addEventListener("history-change", () => this.refresh());
    }

    protected build(): HTMLElement {
        const panel = document.createElement("section");
        panel.className = "voxlab__actions-panel";

        const buttonRow = document.createElement("div");
        buttonRow.style.display = "grid";
        buttonRow.style.gridTemplateColumns = "1fr 1fr 1fr";
        buttonRow.style.gap = "0";

        this.undoBtn = this.makeBtn("Undo");
        this.redoBtn = this.makeBtn("Redo");
        this.clearBtn = this.makeBtn("Clear");
        this.undoBtn.style.borderRight = "0";
        this.redoBtn.style.borderRight = "0";

        this.undoBtn.addEventListener("click", () => this.deps.onUndo());
        this.redoBtn.addEventListener("click", () => this.deps.onRedo());
        this.clearBtn.addEventListener("click", async () => {
            const ok = await modalService.confirm("Reset every changed setting to its default?", {
                danger: true,
                confirmLabel: "Reset",
            });
            if (ok) {
                this.deps.onClearAll();
            }
        });

        buttonRow.appendChild(this.undoBtn);
        buttonRow.appendChild(this.redoBtn);
        buttonRow.appendChild(this.clearBtn);
        panel.appendChild(buttonRow);

        const title = document.createElement("div");
        title.className = "voxlab__actions-title";
        title.textContent = "Changed settings";
        panel.appendChild(title);

        this.listHost = document.createElement("div");
        this.listHost.className = "voxlab__actions-list";
        panel.appendChild(this.listHost);

        this.refresh();
        return panel;
    }

    private makeBtn(label: string): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "voxlab__actions-row-btn";
        btn.textContent = label;
        return btn;
    }

    private refresh(): void {
        if (!this.listHost) {
            return;
        }
        const canUndo = this.deps.history.canUndo();
        const canRedo = this.deps.history.canRedo();
        const undoPeek = this.deps.history.peekUndo();
        const redoPeek = this.deps.history.peekRedo();
        this.undoBtn.disabled = !canUndo;
        this.redoBtn.disabled = !canRedo;
        this.undoBtn.title = undoPeek ? `Undo: ${describeEntry(undoPeek)}` : "Nothing to undo";
        this.redoBtn.title = redoPeek ? `Redo: ${describeEntry(redoPeek)}` : "Nothing to redo";

        const changed = this.deps.history.getChangedSettings(this.deps.getSnapshot());
        this.clearBtn.disabled = changed.length === 0;

        if (changed.length === 0) {
            const empty = document.createElement("div");
            empty.className = "voxlab__actions-empty";
            empty.textContent = "All settings at default.";
            this.listHost.replaceChildren(empty);
            return;
        }
        const sorted = [...changed].sort((a, b) => a.path.localeCompare(b.path));
        this.listHost.replaceChildren(...sorted.map((c) => this.makeRow(c)));
    }

    private makeRow(setting: ChangedSetting): HTMLElement {
        const row = document.createElement("div");
        row.className = "voxlab__actions-row";
        const name = document.createElement("span");
        name.className = "voxlab__actions-row-name";
        name.textContent = `${formatPath(setting.path)} · ${formatValue(setting.currentValue)}`;
        name.title = `Default: ${formatValue(setting.defaultValue)}`;
        const actions = document.createElement("div");
        actions.className = "voxlab__actions-row-actions";
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "voxlab__actions-row-btn voxlab__actions-row-btn--danger";
        resetBtn.textContent = "Reset";
        resetBtn.title = `Reset to ${formatValue(setting.defaultValue)}`;
        resetBtn.addEventListener("click", () => this.deps.onResetPath(setting.path));
        actions.appendChild(resetBtn);
        row.appendChild(name);
        row.appendChild(actions);
        return row;
    }
}

function describeEntry(entry: HistoryEntry): string {
    return `${formatPath(entry.path)} ${formatValue(entry.prevValue)} → ${formatValue(entry.nextValue)}`;
}

function formatPath(path: string): string {
    return path;
}

function formatValue(value: unknown): string {
    if (typeof value === "number") {
        return trimZeros(value.toFixed(3));
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "boolean") {
        return value ? "on" : "off";
    }
    if (value === undefined) {
        return "·";
    }
    return JSON.stringify(value);
}

function trimZeros(s: string): string {
    if (!s.includes(".")) {
        return s;
    }
    let end = s.length;
    while (end > 0 && s.charAt(end - 1) === "0") {
        end--;
    }
    if (end > 0 && s.charAt(end - 1) === ".") {
        end--;
    }
    return s.slice(0, end);
}
