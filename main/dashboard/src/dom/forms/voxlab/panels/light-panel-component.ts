import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import type { LightingManager } from "../../../../managers/voxlab/lighting-manager.js";
import { modalService } from "../../../../managers/voxlab/services/modal-service.js";

export interface LightPanelDeps {
    lighting: LightingManager;
    onHdrChanged: () => void;
    sections: ReadonlyArray<BaseVoxlabComponent>;
}

export class LightPanelComponent extends BaseVoxlabComponent {
    private hdrStatus!: HTMLElement;

    constructor(private readonly deps: LightPanelDeps) {
        super();
    }

    protected build(): HTMLElement {
        const panel = document.createElement("section");

        const hdrSection = document.createElement("div");
        hdrSection.style.padding = "0.45rem 0.6rem";
        hdrSection.style.borderBottom = "1px solid var(--border)";
        hdrSection.style.display = "flex";
        hdrSection.style.flexDirection = "column";
        hdrSection.style.gap = "0.15rem";

        const hdrTitle = document.createElement("div");
        hdrTitle.className = "voxlab__presets-group-title";
        hdrTitle.textContent = "Environment HDR";
        hdrSection.appendChild(hdrTitle);

        const hdrRow = document.createElement("div");
        hdrRow.style.display = "grid";
        hdrRow.style.gridTemplateColumns = "1fr 1fr";
        hdrRow.style.gap = "0";
        const uploadBtn = this.makeBtn("Upload .hdr");
        const clearBtn = this.makeBtn("Use procedural");
        uploadBtn.style.borderRight = "0";
        uploadBtn.addEventListener("click", () => this.uploadHdr());
        clearBtn.addEventListener("click", () => {
            this.deps.lighting.clearHdr();
            this.deps.onHdrChanged();
            this.refreshHdrStatus();
        });
        hdrRow.appendChild(uploadBtn);
        hdrRow.appendChild(clearBtn);
        hdrSection.appendChild(hdrRow);

        this.hdrStatus = document.createElement("div");
        this.hdrStatus.className = "voxlab__actions-empty";
        this.hdrStatus.style.textAlign = "left";
        this.hdrStatus.style.padding = "0.3rem 0";
        hdrSection.appendChild(this.hdrStatus);
        this.refreshHdrStatus();

        panel.appendChild(hdrSection);

        const lightsTitle = document.createElement("div");
        lightsTitle.className = "voxlab__presets-group-title";
        lightsTitle.textContent = "Lighting";
        lightsTitle.style.padding = "0.45rem 0.6rem";
        panel.appendChild(lightsTitle);

        for (const section of this.deps.sections) {
            section.mount(panel);
        }

        return panel;
    }

    refreshHdrStatus(): void {
        if (!this.hdrStatus) {
            return;
        }
        const name = this.deps.lighting.hdrName;
        this.hdrStatus.textContent = name ? `HDR: ${name}` : "HDR: procedural env";
    }

    private makeBtn(label: string): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "voxlab__presets-row-btn";
        btn.textContent = label;
        return btn;
    }

    private uploadHdr(): void {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".hdr,image/vnd.radiance,application/octet-stream";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) {
                return;
            }
            try {
                const buffer = await file.arrayBuffer();
                await this.deps.lighting.loadHdr(buffer, file.name);
                this.deps.onHdrChanged();
                this.refreshHdrStatus();
            } catch (err) {
                await modalService.alert(`Could not load HDR: ${err instanceof Error ? err.message : String(err)}`);
            }
        });
        input.click();
    }

    protected onUnmount(): void {
        for (const section of this.deps.sections) {
            section.unmount();
        }
    }
}
