import { asideEl, button, div, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { readStored, writeStored } from "../../../../state/persistence/index.js";
import {
    SIDEBAR_CLASS,
    SIDEBAR_PUBLISH_BTN_CLASS,
    TABS_HOST_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";
import { ExportPanelComponent } from "./export-panel-component.js";
import { StatsPanelComponent } from "./stats-panel-component.js";
import { TabBarComponent, type TabChangeDetail } from "./tab-bar-component.js";

const TAB_STORAGE_KEY = "clansocket:voxlab.tab.right";
const FALLBACK_TAB = "display";
const LEGACY_TABS = new Set(["load", "controls", "convert", "stats"]);
const VALID_TABS = new Set(["display", "camera", "scene", "export", "actions"]);

const TAB_DEFS: ReadonlyArray<{ id: string; label: string }> = [
    { id: "display", label: "Display" },
    { id: "camera", label: "Camera" },
    { id: "scene", label: "Scene" },
    { id: "export", label: "Export" },
    { id: "actions", label: "Actions" },
];

export class SidebarComponent extends BaseVoxlabComponent {
    readonly statsPanel = new StatsPanelComponent();
    readonly exportPanel = new ExportPanelComponent();
    private readonly tabBar = new TabBarComponent();
    private readonly hostsByTab = new Map<string, Instance>();
    private publishButton!: Instance<HTMLButtonElement>;

    get displayContainer(): HTMLElement {
        void this.root;
        return this.requireHost("display");
    }

    get cameraContainer(): HTMLElement {
        void this.root;
        return this.requireHost("camera");
    }

    get sceneContainer(): HTMLElement {
        void this.root;
        return this.requireHost("scene");
    }

    get exportContainer(): HTMLElement {
        void this.root;
        return this.requireHost("export");
    }

    get actionsContainer(): HTMLElement {
        void this.root;
        return this.requireHost("actions");
    }

    private requireHost(tabId: string): HTMLElement {
        const host = this.hostsByTab.get(tabId);
        if (!host) {
            throw new Error(`voxlab sidebar: tab host '${tabId}' not built`);
        }
        return host.el;
    }

    protected build(): HTMLElement {
        const aside = asideEl({ classes: [SIDEBAR_CLASS], context: null, meta: null });

        this.publishButton = button({
            classes: [SIDEBAR_PUBLISH_BTN_CLASS],
            text: "Publish",
            type: "button",
            disabled: "true",
            context: "publish the voxlab clan logo as a voxlab record",
            meta: ["action", "clan"],
            onClick: () => this.emit<void>("publish-requested", undefined),
        });
        aside.addChild(this.publishButton.el);

        const initialTab = loadTabSelection();
        this.tabBar.setTabs(TAB_DEFS, initialTab);
        this.tabBar.mount(aside.el);

        for (const def of TAB_DEFS) {
            const host = div({
                classes: [TABS_HOST_CLASS],
                data: { active: def.id === initialTab ? "true" : "false" },
                context: null,
                meta: null,
            });
            this.hostsByTab.set(def.id, host);
            aside.addChild(host.el);
        }

        this.exportPanel.mount(this.requireHost("export"));

        this.tabBar.addEventListener("tab-change", (e) => {
            const { id } = (e as CustomEvent<TabChangeDetail>).detail;
            this.activateTab(id);
            saveTabSelection(id);
        });

        return aside.el;
    }

    private activateTab(activeId: string): void {
        for (const [tabId, instance] of this.hostsByTab) {
            instance.setAttr("data-active", tabId === activeId ? "true" : "false");
        }
    }

    setExportEnabled(enabled: boolean): void {
        this.exportPanel.setEnabled(enabled);
    }

    setPublishEnabled(enabled: boolean): void {
        this.publishButton.setAttr("disabled", enabled ? null : "true");
    }

    setPublishBusy(busy: boolean): void {
        this.publishButton.setAttr("disabled", busy ? "true" : null);
        this.publishButton.setText(busy ? "Publishing…" : "Publish");
    }

    protected onUnmount(): void {
        this.tabBar.unmount();
        this.statsPanel.unmount();
        this.exportPanel.unmount();
    }
}

function loadTabSelection(): string {
    const raw = readStored<string>(TAB_STORAGE_KEY);
    if (!raw) {
        return FALLBACK_TAB;
    }
    if (LEGACY_TABS.has(raw)) {
        return FALLBACK_TAB;
    }
    if (VALID_TABS.has(raw)) {
        return raw;
    }
    return FALLBACK_TAB;
}

function saveTabSelection(id: string): void {
    writeStored(TAB_STORAGE_KEY, id);
}
