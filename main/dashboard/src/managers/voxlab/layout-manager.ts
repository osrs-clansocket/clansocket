import type { BaseVoxlabComponent } from "./base/base-voxlab-component.js";
import { LayoutShellComponent, type ShellActionDetail } from "../../dom/forms/voxlab/panels/layout-shell-component.js";
import { LayoutPersistenceService } from "./services/layout-persistence-service.js";
import {
    LAYOUT_SCHEMA_VERSION,
    type LayoutEntry,
    type LayoutSide,
    type LayoutState,
} from "../../shared/types/voxlab/layout-types.js";

export interface ContainerRegistration {
    id: string;
    title: string;
    component: BaseVoxlabComponent;
    defaultSide: LayoutSide;
}

interface MountedShell {
    id: string;
    shell: LayoutShellComponent;
    component: BaseVoxlabComponent;
    collapsed: boolean;
    side: LayoutSide;
}

export class LayoutManager {
    private readonly registrations = new Map<string, ContainerRegistration>();
    private readonly persistence: LayoutPersistenceService;
    private shells = new Map<string, MountedShell>();
    private leftHost: HTMLElement | null = null;
    private rightHost: HTMLElement | null = null;
    private state: LayoutState | null = null;

    constructor(persistence?: LayoutPersistenceService) {
        this.persistence = persistence ?? new LayoutPersistenceService();
    }

    register(entry: ContainerRegistration): void {
        this.registrations.set(entry.id, entry);
    }

    attach(hosts: { left: HTMLElement; right: HTMLElement }): void {
        this.leftHost = hosts.left;
        this.rightHost = hosts.right;
        const stored = this.persistence.load();
        this.state = this.normalise(stored);
        this.render();
    }

    private normalise(stored: LayoutState | null): LayoutState {
        const known = new Set(this.registrations.keys());
        const seen = new Set<string>();
        const collect = (entries: LayoutEntry[] | undefined): LayoutEntry[] => {
            if (!entries) {
                return [];
            }
            const out: LayoutEntry[] = [];
            for (const entry of entries) {
                if (known.has(entry.id) && !seen.has(entry.id)) {
                    seen.add(entry.id);
                    out.push({ id: entry.id, collapsed: !!entry.collapsed });
                }
            }
            return out;
        };
        const left = collect(stored?.left);
        const right = collect(stored?.right);
        for (const reg of this.registrations.values()) {
            if (seen.has(reg.id)) {
                continue;
            }
            const entry: LayoutEntry = { id: reg.id, collapsed: false };
            (reg.defaultSide === "left" ? left : right).push(entry);
        }
        return {
            schemaVersion: LAYOUT_SCHEMA_VERSION,
            left,
            right,
        };
    }

    private render(): void {
        if (!this.state || !this.leftHost || !this.rightHost) {
            return;
        }
        for (const mounted of this.shells.values()) {
            mounted.component.unmount();
            mounted.shell.unmount();
        }
        this.shells.clear();
        this.renderSide("left", this.leftHost, this.state.left);
        this.renderSide("right", this.rightHost, this.state.right);
    }

    private renderSide(side: LayoutSide, host: HTMLElement, entries: LayoutEntry[]): void {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const reg = this.registrations.get(entry.id);
            if (!reg) {
                continue;
            }
            const shell = new LayoutShellComponent({
                id: reg.id,
                title: reg.title,
                side,
                collapsed: entry.collapsed,
            });
            shell.mount(host);
            reg.component.mount(shell.body);
            shell.setMovability(i > 0, i < entries.length - 1);
            shell.addEventListener("shell-action", (e) => {
                const detail = (e as CustomEvent<ShellActionDetail>).detail;
                this.handleAction(detail);
            });
            this.shells.set(reg.id, { id: reg.id, shell, component: reg.component, collapsed: entry.collapsed, side });
        }
    }

    private handleAction(detail: ShellActionDetail): void {
        if (!this.state) {
            return;
        }
        if (detail.action === "toggle-collapse") {
            this.toggleCollapse(detail.id);
            return;
        }
        if (detail.action === "swap") {
            this.swapSide(detail.id);
            return;
        }
        if (detail.action === "up") {
            this.move(detail.id, -1);
            return;
        }
        if (detail.action === "down") {
            this.move(detail.id, 1);
        }
    }

    private toggleCollapse(id: string): void {
        const entry = this.findEntry(id);
        if (!entry || !this.state) {
            return;
        }
        entry.collapsed = !entry.collapsed;
        this.shells.get(id)?.shell.setCollapsed(entry.collapsed);
        this.persist();
    }

    private swapSide(id: string): void {
        if (!this.state) {
            return;
        }
        const fromLeft = this.state.left.findIndex((e) => e.id === id);
        if (fromLeft >= 0) {
            const [entry] = this.state.left.splice(fromLeft, 1);
            this.state.right.push(entry);
            this.persistAndRender();
            return;
        }
        const fromRight = this.state.right.findIndex((e) => e.id === id);
        if (fromRight >= 0) {
            const [entry] = this.state.right.splice(fromRight, 1);
            this.state.left.push(entry);
            this.persistAndRender();
        }
    }

    private move(id: string, delta: number): void {
        if (!this.state) {
            return;
        }
        for (const side of ["left", "right"] as const) {
            const list = this.state[side];
            const idx = list.findIndex((e) => e.id === id);
            if (idx < 0) {
                continue;
            }
            const target = idx + delta;
            if (target < 0 || target >= list.length) {
                return;
            }
            const [moved] = list.splice(idx, 1);
            list.splice(target, 0, moved);
            this.persistAndRender();
            return;
        }
    }

    private findEntry(id: string): LayoutEntry | undefined {
        if (!this.state) {
            return undefined;
        }
        return this.state.left.find((e) => e.id === id) ?? this.state.right.find((e) => e.id === id);
    }

    private persistAndRender(): void {
        this.persist();
        this.render();
    }

    private persist(): void {
        if (this.state) {
            this.persistence.save(this.state);
        }
    }
}
