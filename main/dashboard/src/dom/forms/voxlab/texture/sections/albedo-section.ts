import { BaseVoxlabComponent } from "../../../../../managers/voxlab/base/base-voxlab-component.js";
import { createFilePicker, type FilePickerHandle } from "../../../glass/inputs/glass-file.js";
import {
    DEFAULT_ALBEDO_SETTINGS,
    MAX_UPLOAD_TEXTURE_DIM,
} from "../../../../../shared/constants/voxlab/texture-paint-constants.js";
import { snapshotRegistry } from "../../../../../state/voxlab/registries/snapshot-registry.js";
import { downsampleDataUrlIfNeeded } from "../../../../../voxlab/mappers/downsample-mapper.js";
import type {
    AlbedoChangeEventDetail,
    AlbedoSettings,
    AlbedoSource,
} from "../../../../../shared/types/voxlab/paint-types.js";
import { DropdownComponent, type DropdownChangeDetail } from "../../panels/dropdown-component.js";

export class AlbedoSection extends BaseVoxlabComponent {
    private settings: AlbedoSettings = { ...DEFAULT_ALBEDO_SETTINGS };
    private filePicker!: FilePickerHandle;
    private sourceDropdown!: DropdownComponent<AlbedoSource>;

    constructor() {
        super();
        snapshotRegistry.register<AlbedoSettings>({
            name: "albedo",
            getState: () => ({ ...this.settings }),
            applyState: (state, opts) => this.apply(state, opts),
            paths: [],
        });
    }

    get current(): AlbedoSettings {
        return { ...this.settings };
    }

    apply(state: AlbedoSettings, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        if (this.sourceDropdown) {
            this.sourceDropdown.select(this.settings.source);
        }
        if (!opts?.silent) {
            this.emit<AlbedoChangeEventDetail>("albedo-change", { ...this.settings });
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_ALBEDO_SETTINGS });
        if (this.filePicker) {
            this.filePicker.clear();
        }
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Albedo";
        section.appendChild(heading);

        this.sourceDropdown = new DropdownComponent<AlbedoSource>(
            [
                { value: "none", label: "Source: None (vertex colors only)" },
                { value: "source-image", label: "Source: Source image" },
                { value: "uploaded", label: "Source: Uploaded" },
            ],
            this.settings.source,
        );
        this.sourceDropdown.mount(section);
        this.sourceDropdown.addEventListener("change", (e) => {
            this.settings.source = (e as CustomEvent<DropdownChangeDetail<AlbedoSource>>).detail.value;
            this.emit<AlbedoChangeEventDetail>("albedo-change", { ...this.settings });
        });

        this.filePicker = createFilePicker({
            label: "Upload albedo image",
            accept: "image/*",
            ariaLabel: "Upload an image to bind as the mesh albedo map",
        });
        this.filePicker.input.addEventListener("change", () => {
            const file = this.filePicker.getCurrent();
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                const result = reader.result;
                if (typeof result !== "string") {
                    return;
                }
                void downsampleDataUrlIfNeeded(result, MAX_UPLOAD_TEXTURE_DIM).then((capped) => {
                    this.settings.uploadedDataUrl = capped;
                    this.settings.source = "uploaded";
                    this.sourceDropdown.select("uploaded");
                    this.emit<AlbedoChangeEventDetail>("albedo-change", { ...this.settings });
                });
            });
            reader.readAsDataURL(file);
        });
        section.appendChild(this.filePicker.wrapper);

        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "voxlab__dropdown-btn-primary";
        clearBtn.textContent = "Clear albedo";
        clearBtn.setAttribute("aria-label", "Remove albedo, return to vertex colors only");
        clearBtn.addEventListener("click", () => {
            this.settings.uploadedDataUrl = null;
            this.settings.source = "none";
            this.sourceDropdown.select("none");
            this.filePicker.clear();
            this.emit<AlbedoChangeEventDetail>("albedo-change", { ...this.settings });
        });
        section.appendChild(clearBtn);

        return section;
    }

    protected onUnmount(): void {
        if (this.sourceDropdown) {
            this.sourceDropdown.unmount();
        }
    }
}
