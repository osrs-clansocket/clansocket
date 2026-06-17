import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { createNumberInput } from "../../../../voxlab/formatters/control-formatter.js";
import { DropdownComponent, type DropdownChangeDetail } from "./dropdown-component.js";

export type ExportFormat = "png" | "webp" | "apng" | "gif" | "png-sequence";

const ANIMATION_FORMATS = new Set<ExportFormat>(["apng", "gif", "png-sequence"]);

const FORMAT_OPTIONS: ReadonlyArray<{ value: ExportFormat; label: string }> = [
    { value: "png", label: "PNG (single frame, alpha)" },
    { value: "webp", label: "WebP (single frame, alpha)" },
    { value: "apng", label: "APNG (animation, clean alpha) — recommended" },
    { value: "gif", label: "GIF (animation, 1-bit alpha via magenta key)" },
    { value: "png-sequence", label: "PNG sequence (zip)" },
];

export interface CaptureRequest {
    format: "png" | "webp";
    width: number;
    height: number;
}

export interface BakeRequest {
    format: "apng" | "gif" | "png-sequence";
    width: number;
    height: number;
    fps: number;
}

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_FPS = 30;
const MIN_DIMENSION = 16;
const MAX_DIMENSION = 4096;
const MIN_FPS = 1;
const MAX_FPS = 120;

export class ExportPanelComponent extends BaseVoxlabComponent {
    private formatDropdown!: DropdownComponent<ExportFormat>;
    private widthInput!: HTMLInputElement;
    private heightInput!: HTMLInputElement;
    private fpsInput!: HTMLInputElement;
    private fpsWrapper!: HTMLElement;
    private captureButton!: HTMLButtonElement;
    private bakeButton!: HTMLButtonElement;
    private actionButtons: HTMLButtonElement[] = [];

    protected build(): HTMLElement {
        const section = document.createElement("section");
        section.className = "voxlab__sidebar-panel voxlab__sidebar-export-panel";

        const heading = document.createElement("h2");
        heading.className = "voxlab__sidebar-panel-heading";
        heading.textContent = "Export";
        section.appendChild(heading);

        this.formatDropdown = new DropdownComponent<ExportFormat>(FORMAT_OPTIONS, "png", "voxlab__dropdown--banner");
        this.formatDropdown.mount(section);

        const width = createNumberInput({
            label: "Width",
            min: MIN_DIMENSION,
            max: MAX_DIMENSION,
            step: 16,
            value: DEFAULT_WIDTH,
        });
        const height = createNumberInput({
            label: "Height",
            min: MIN_DIMENSION,
            max: MAX_DIMENSION,
            step: 16,
            value: DEFAULT_HEIGHT,
        });
        const fps = createNumberInput({ label: "FPS", min: MIN_FPS, max: MAX_FPS, step: 1, value: DEFAULT_FPS });
        this.widthInput = width.input;
        this.heightInput = height.input;
        this.fpsInput = fps.input;
        this.fpsWrapper = fps.wrapper;
        section.appendChild(width.wrapper);
        section.appendChild(height.wrapper);
        section.appendChild(fps.wrapper);

        this.captureButton = makeButton("Capture frame", "voxlab__dropdown-btn-primary");
        this.bakeButton = makeButton("Bake animation", "voxlab__dropdown-btn-primary");
        section.appendChild(this.captureButton);
        section.appendChild(this.bakeButton);

        this.actionButtons = [this.captureButton, this.bakeButton];
        for (const btn of this.actionButtons) {
            btn.disabled = true;
        }

        this.wireEvents();
        this.applyFormatVisibility(this.formatDropdown.value);
        return section;
    }

    setEnabled(enabled: boolean): void {
        for (const btn of this.actionButtons) {
            btn.disabled = !enabled;
        }
        this.applyFormatVisibility(this.formatDropdown.value);
    }

    protected onUnmount(): void {
        this.formatDropdown.unmount();
    }

    private wireEvents(): void {
        this.formatDropdown.addEventListener("change", (e) => {
            const detail = (e as CustomEvent<DropdownChangeDetail<ExportFormat>>).detail;
            this.applyFormatVisibility(detail.value);
        });
        this.captureButton.addEventListener("click", () => {
            const fmt = this.formatDropdown.value;
            if (fmt !== "png" && fmt !== "webp") {
                return;
            }
            const req: CaptureRequest = {
                format: fmt,
                width: this.readDimension(this.widthInput, DEFAULT_WIDTH),
                height: this.readDimension(this.heightInput, DEFAULT_HEIGHT),
            };
            this.emit<CaptureRequest>("capture-requested", req);
        });
        this.bakeButton.addEventListener("click", () => {
            const fmt = this.formatDropdown.value;
            if (!ANIMATION_FORMATS.has(fmt)) {
                return;
            }
            const req: BakeRequest = {
                format: fmt as BakeRequest["format"],
                width: this.readDimension(this.widthInput, DEFAULT_WIDTH),
                height: this.readDimension(this.heightInput, DEFAULT_HEIGHT),
                fps: this.readFps(),
            };
            this.emit<BakeRequest>("bake-requested", req);
        });
    }

    private applyFormatVisibility(format: ExportFormat): void {
        const isAnimation = ANIMATION_FORMATS.has(format);
        this.bakeButton.style.display = isAnimation ? "" : "none";
        this.captureButton.style.display = isAnimation ? "none" : "";
        this.fpsWrapper.style.display = isAnimation ? "" : "none";
    }

    private readDimension(input: HTMLInputElement, fallback: number): number {
        const n = Number.parseInt(input.value, 10);
        if (!Number.isFinite(n) || n < MIN_DIMENSION) {
            return fallback;
        }
        return Math.min(MAX_DIMENSION, n);
    }

    private readFps(): number {
        const n = Number.parseInt(this.fpsInput.value, 10);
        if (!Number.isFinite(n) || n < MIN_FPS) {
            return DEFAULT_FPS;
        }
        return Math.min(MAX_FPS, n);
    }
}

function makeButton(text: string, className: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = text;
    return btn;
}
