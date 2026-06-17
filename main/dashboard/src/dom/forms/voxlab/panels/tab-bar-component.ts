import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";

export interface TabSpec {
    id: string;
    label: string;
}

export interface TabChangeDetail {
    id: string;
}

export class TabBarComponent extends BaseVoxlabComponent {
    private tabs: TabSpec[] = [];
    private activeId = "";
    private buttonsByid = new Map<string, HTMLButtonElement>();
    private container!: HTMLElement;

    setTabs(tabs: ReadonlyArray<TabSpec>, initialActive: string): void {
        this.tabs = [...tabs];
        this.activeId = initialActive;
        this.rebuild();
    }

    setActive(id: string): void {
        if (this.activeId === id) {
            return;
        }
        this.activeId = id;
        for (const [tabId, button] of this.buttonsByid.entries()) {
            button.dataset.active = tabId === id ? "true" : "false";
        }
        this.emit<TabChangeDetail>("tab-change", { id });
    }

    get active(): string {
        return this.activeId;
    }

    protected build(): HTMLElement {
        this.container = document.createElement("div");
        this.container.className = "voxlab__tabs";
        // If setTabs ran before mount (the normal call order from owner
        // components), the prior rebuild() couldn't paint because the
        // container didn't exist yet — flush now.
        this.rebuild();
        return this.container;
    }

    private rebuild(): void {
        if (!this.container) {
            return;
        }
        this.buttonsByid.clear();
        this.container.replaceChildren();
        for (const tab of this.tabs) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "voxlab__tabs-btn";
            button.textContent = tab.label;
            button.dataset.active = tab.id === this.activeId ? "true" : "false";
            button.addEventListener("click", () => this.setActive(tab.id));
            this.container.appendChild(button);
            this.buttonsByid.set(tab.id, button);
        }
    }
}
