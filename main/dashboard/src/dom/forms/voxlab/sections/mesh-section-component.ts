import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import {
    createColorInput,
    createSliderInput,
    createToggleInput,
} from "../../../../voxlab/formatters/control-formatter.js";
import { pathNumber, snapshotRegistry, type PathSpec } from "../../../../state/voxlab/registries/snapshot-registry.js";
import {
    CORNER_ANGLE_MAX,
    CORNER_ANGLE_MIN,
    DEFAULT_MESH_SETTINGS,
    MESH_SCALE_MAX,
    MESH_SCALE_MIN,
    SMOOTHING_ROUNDS_MAX,
    SMOOTHING_ROUNDS_MIN,
    TAUBIN_LAMBDA_MAX,
    TAUBIN_LAMBDA_MIN,
    TAUBIN_MU_MAX,
    TAUBIN_MU_MIN,
} from "../../../../shared/constants/voxlab/mesh-settings-constants.js";
import type { MeshSettings } from "../../../../shared/types/voxlab/mesh-settings-types.js";

// Only `scale` is animatable: it maps to a cheap group-transform update.
// `smoothingRounds` triggers a full geometry rebuild on change so it stays
// snapshot-only (recorded into snapshots, restored on load, but not tracked
// by the timeline — animating it would re-bake the mesh on every frame).
const MESH_PATHS: ReadonlyArray<PathSpec> = [pathNumber("scale", "scale")];

export class MeshSectionComponent extends BaseVoxlabComponent {
    private settings: MeshSettings = { ...DEFAULT_MESH_SETTINGS };
    private inputs!: {
        smoothingRounds: HTMLInputElement;
        cornerAngle: HTMLInputElement;
        scale: HTMLInputElement;
        normalize: HTMLInputElement;
        vertexColor: HTMLInputElement;
        taubinLambda: HTMLInputElement;
        taubinMu: HTMLInputElement;
    };

    constructor() {
        super();
        snapshotRegistry.register<MeshSettings>({
            name: "mesh",
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths: MESH_PATHS,
        });
    }

    get current(): MeshSettings {
        return { ...this.settings };
    }

    apply(state: MeshSettings, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        this.inputs.smoothingRounds.value = String(this.settings.smoothingRounds);
        this.inputs.cornerAngle.value = String(this.settings.cornerAngleDegrees);
        this.inputs.scale.value = String(this.settings.scale);
        this.inputs.normalize.checked = this.settings.normalize;
        this.inputs.vertexColor.value = this.settings.vertexColor;
        this.inputs.taubinLambda.value = String(this.settings.taubinLambda);
        this.inputs.taubinMu.value = String(this.settings.taubinMu);
        if (!opts?.silent) {
            this.emit<MeshSettings>("mesh-change", this.current);
        }
    }

    reset(): void {
        this.apply({ ...DEFAULT_MESH_SETTINGS });
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Mesh";
        section.appendChild(heading);

        const reloadBtn = document.createElement("button");
        reloadBtn.type = "button";
        reloadBtn.className = "voxlab__dropdown-btn-primary";
        reloadBtn.textContent = "Reload from source";
        // forwarded by voxlab-app-manager.wireSectionEvents() → editor.on("reload"),
        // which the page composer owns (source-image cache + raster-to-mesh).
        reloadBtn.addEventListener("click", () => this.emit<null>("mesh-reload", null));
        section.appendChild(reloadBtn);

        const smoothingRounds = createSliderInput({
            label: "Side smoothing rounds",
            min: SMOOTHING_ROUNDS_MIN,
            max: SMOOTHING_ROUNDS_MAX,
            step: 1,
            value: DEFAULT_MESH_SETTINGS.smoothingRounds,
            formatValue: (n) => `${Math.round(n)}`,
        });
        const cornerAngle = createSliderInput({
            label: "Corner threshold",
            min: CORNER_ANGLE_MIN,
            max: CORNER_ANGLE_MAX,
            step: 0.5,
            value: DEFAULT_MESH_SETTINGS.cornerAngleDegrees,
            formatValue: (n) => `${n.toFixed(1)}°`,
        });
        const scale = createSliderInput({
            label: "Scale",
            min: MESH_SCALE_MIN,
            max: MESH_SCALE_MAX,
            step: 0.01,
            value: DEFAULT_MESH_SETTINGS.scale,
        });
        const normalize = createToggleInput({
            label: "Normalize to unit cube",
            checked: DEFAULT_MESH_SETTINGS.normalize,
        });
        const vertexColor = createColorInput({
            label: "Vertex tint",
            value: DEFAULT_MESH_SETTINGS.vertexColor,
        });
        const taubinLambda = createSliderInput({
            label: "Taubin λ (smooth)",
            min: TAUBIN_LAMBDA_MIN,
            max: TAUBIN_LAMBDA_MAX,
            step: 0.01,
            value: DEFAULT_MESH_SETTINGS.taubinLambda,
            formatValue: (n) => n.toFixed(2),
        });
        const taubinMu = createSliderInput({
            label: "Taubin μ (inflate)",
            min: TAUBIN_MU_MIN,
            max: TAUBIN_MU_MAX,
            step: 0.01,
            value: DEFAULT_MESH_SETTINGS.taubinMu,
            formatValue: (n) => n.toFixed(2),
        });

        section.appendChild(smoothingRounds.wrapper);
        section.appendChild(cornerAngle.wrapper);
        section.appendChild(scale.wrapper);
        section.appendChild(normalize.wrapper);
        section.appendChild(vertexColor.wrapper);
        section.appendChild(taubinLambda.wrapper);
        section.appendChild(taubinMu.wrapper);

        this.inputs = {
            smoothingRounds: smoothingRounds.input,
            cornerAngle: cornerAngle.input,
            scale: scale.input,
            normalize: normalize.input,
            vertexColor: vertexColor.input,
            taubinLambda: taubinLambda.input,
            taubinMu: taubinMu.input,
        };
        this.wireInputs();
        return section;
    }

    private wireInputs(): void {
        const emit = (): void => this.emit<MeshSettings>("mesh-change", this.current);
        const emitBake = (): void => this.emit<MeshSettings>("mesh-bake-change", this.current);
        this.inputs.smoothingRounds.addEventListener("change", () => {
            this.settings.smoothingRounds = Math.round(Number.parseFloat(this.inputs.smoothingRounds.value));
            emit();
            emitBake();
        });
        this.inputs.cornerAngle.addEventListener("change", () => {
            this.settings.cornerAngleDegrees = Number.parseFloat(this.inputs.cornerAngle.value);
            emit();
            emitBake();
        });
        this.inputs.scale.addEventListener("input", () => {
            this.settings.scale = Number.parseFloat(this.inputs.scale.value);
            emit();
        });
        this.inputs.normalize.addEventListener("change", () => {
            this.settings.normalize = this.inputs.normalize.checked;
            emit();
            emitBake();
        });
        this.inputs.vertexColor.addEventListener("input", () => {
            this.settings.vertexColor = this.inputs.vertexColor.value;
            emit();
            emitBake();
        });
        this.inputs.taubinLambda.addEventListener("change", () => {
            this.settings.taubinLambda = Number.parseFloat(this.inputs.taubinLambda.value);
            emit();
            emitBake();
        });
        this.inputs.taubinMu.addEventListener("change", () => {
            this.settings.taubinMu = Number.parseFloat(this.inputs.taubinMu.value);
            emit();
            emitBake();
        });
    }
}
