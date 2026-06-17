import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { createSliderInput } from "../../../../voxlab/formatters/control-formatter.js";

export type CameraIntent = "reset" | "front";
import { pathNumber, snapshotRegistry, type PathSpec } from "../../../../state/voxlab/registries/snapshot-registry.js";
import {
    CAMERA_DAMPING_MAX,
    CAMERA_DAMPING_MIN,
    CAMERA_FAR_MAX,
    CAMERA_FAR_MIN,
    CAMERA_FIT_MULTIPLIER_MAX,
    CAMERA_FIT_MULTIPLIER_MIN,
    CAMERA_FOV_MAX,
    CAMERA_FOV_MIN,
    CAMERA_NEAR_MAX,
    CAMERA_NEAR_MIN,
    CAMERA_POSITION_MAX,
    CAMERA_POSITION_MIN,
    DEFAULT_CAMERA,
} from "../../../../shared/constants/voxlab/camera-constants.js";
import type { CameraSettings } from "../../../../shared/types/voxlab/camera-types.js";

// near/far are animatable (cheap projection-matrix update per frame).
// dampingFactor + fit/front multipliers are configurable but not animatable
// (they affect orbit feel and reset/front-view actions; animating them on the
// timeline doesn't yield a useful artistic outcome).
const CAMERA_PATHS: ReadonlyArray<PathSpec> = [
    pathNumber("fov", "fov"),
    pathNumber("near", "near"),
    pathNumber("far", "far"),
    pathNumber("positionX", "positionX"),
    pathNumber("positionY", "positionY"),
    pathNumber("positionZ", "positionZ"),
    pathNumber("targetX", "targetX"),
    pathNumber("targetY", "targetY"),
    pathNumber("targetZ", "targetZ"),
];

export class CameraSectionComponent extends BaseVoxlabComponent {
    private settings: CameraSettings = { ...DEFAULT_CAMERA };
    private inputs!: {
        fov: HTMLInputElement;
        near: HTMLInputElement;
        far: HTMLInputElement;
        posX: HTMLInputElement;
        posY: HTMLInputElement;
        posZ: HTMLInputElement;
        tgtX: HTMLInputElement;
        tgtY: HTMLInputElement;
        tgtZ: HTMLInputElement;
        damping: HTMLInputElement;
        fitMul: HTMLInputElement;
        frontMul: HTMLInputElement;
    };

    constructor() {
        super();
        snapshotRegistry.register<CameraSettings>({
            name: "camera",
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths: CAMERA_PATHS,
        });
    }

    get current(): CameraSettings {
        return { ...this.settings };
    }

    apply(state: CameraSettings, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        this.inputs.fov.value = String(this.settings.fov);
        this.inputs.near.value = String(this.settings.near);
        this.inputs.far.value = String(this.settings.far);
        this.inputs.posX.value = String(this.settings.positionX);
        this.inputs.posY.value = String(this.settings.positionY);
        this.inputs.posZ.value = String(this.settings.positionZ);
        this.inputs.tgtX.value = String(this.settings.targetX);
        this.inputs.tgtY.value = String(this.settings.targetY);
        this.inputs.tgtZ.value = String(this.settings.targetZ);
        this.inputs.damping.value = String(this.settings.dampingFactor);
        this.inputs.fitMul.value = String(this.settings.fitDistanceMultiplier);
        this.inputs.frontMul.value = String(this.settings.frontDistanceMultiplier);
        if (!opts?.silent) {
            this.emit<CameraSettings>("camera-change", this.current);
        }
    }

    syncFrom(state: CameraSettings): void {
        this.apply(state, { silent: true });
    }

    reset(): void {
        this.apply({ ...DEFAULT_CAMERA });
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = "Camera";
        section.appendChild(heading);

        const buttonRow = document.createElement("div");
        buttonRow.className = "voxlab__dropdown-button-row";
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.textContent = "Reset camera";
        resetBtn.addEventListener("click", () => this.emit<CameraIntent>("camera-intent", "reset"));
        const frontBtn = document.createElement("button");
        frontBtn.type = "button";
        frontBtn.textContent = "Front view";
        frontBtn.addEventListener("click", () => this.emit<CameraIntent>("camera-intent", "front"));
        buttonRow.appendChild(resetBtn);
        buttonRow.appendChild(frontBtn);
        section.appendChild(buttonRow);

        const positionSlider = (label: string, value: number) =>
            createSliderInput({ label, min: CAMERA_POSITION_MIN, max: CAMERA_POSITION_MAX, step: 0.05, value });

        const fov = createSliderInput({
            label: "FOV",
            min: CAMERA_FOV_MIN,
            max: CAMERA_FOV_MAX,
            step: 0.5,
            value: DEFAULT_CAMERA.fov,
            formatValue: (n) => `${Math.round(n)}°`,
        });
        const near = createSliderInput({
            label: "Near clip",
            min: CAMERA_NEAR_MIN,
            max: CAMERA_NEAR_MAX,
            step: 0.001,
            value: DEFAULT_CAMERA.near,
            formatValue: (n) => n.toFixed(3),
        });
        const far = createSliderInput({
            label: "Far clip",
            min: CAMERA_FAR_MIN,
            max: CAMERA_FAR_MAX,
            step: 1,
            value: DEFAULT_CAMERA.far,
            formatValue: (n) => `${Math.round(n)}`,
        });
        const posX = positionSlider("Position X", DEFAULT_CAMERA.positionX);
        const posY = positionSlider("Position Y", DEFAULT_CAMERA.positionY);
        const posZ = positionSlider("Position Z", DEFAULT_CAMERA.positionZ);
        const tgtX = positionSlider("Target X", DEFAULT_CAMERA.targetX);
        const tgtY = positionSlider("Target Y", DEFAULT_CAMERA.targetY);
        const tgtZ = positionSlider("Target Z", DEFAULT_CAMERA.targetZ);
        const damping = createSliderInput({
            label: "Orbit damping",
            min: CAMERA_DAMPING_MIN,
            max: CAMERA_DAMPING_MAX,
            step: 0.01,
            value: DEFAULT_CAMERA.dampingFactor,
        });
        const fitMul = createSliderInput({
            label: "Fit distance multiplier",
            min: CAMERA_FIT_MULTIPLIER_MIN,
            max: CAMERA_FIT_MULTIPLIER_MAX,
            step: 0.05,
            value: DEFAULT_CAMERA.fitDistanceMultiplier,
        });
        const frontMul = createSliderInput({
            label: "Front-view multiplier",
            min: CAMERA_FIT_MULTIPLIER_MIN,
            max: CAMERA_FIT_MULTIPLIER_MAX,
            step: 0.05,
            value: DEFAULT_CAMERA.frontDistanceMultiplier,
        });

        for (const c of [fov, near, far, posX, posY, posZ, tgtX, tgtY, tgtZ, damping, fitMul, frontMul]) {
            section.appendChild(c.wrapper);
        }

        this.inputs = {
            fov: fov.input,
            near: near.input,
            far: far.input,
            posX: posX.input,
            posY: posY.input,
            posZ: posZ.input,
            tgtX: tgtX.input,
            tgtY: tgtY.input,
            tgtZ: tgtZ.input,
            damping: damping.input,
            fitMul: fitMul.input,
            frontMul: frontMul.input,
        };
        this.wireInputs();
        return section;
    }

    private wireInputs(): void {
        const emit = (): void => this.emit<CameraSettings>("camera-change", this.current);
        const fields: Array<[HTMLInputElement, keyof CameraSettings]> = [
            [this.inputs.fov, "fov"],
            [this.inputs.near, "near"],
            [this.inputs.far, "far"],
            [this.inputs.posX, "positionX"],
            [this.inputs.posY, "positionY"],
            [this.inputs.posZ, "positionZ"],
            [this.inputs.tgtX, "targetX"],
            [this.inputs.tgtY, "targetY"],
            [this.inputs.tgtZ, "targetZ"],
            [this.inputs.damping, "dampingFactor"],
            [this.inputs.fitMul, "fitDistanceMultiplier"],
            [this.inputs.frontMul, "frontDistanceMultiplier"],
        ];
        for (const [input, key] of fields) {
            input.addEventListener("input", () => {
                (this.settings[key] as number) = Number.parseFloat(input.value);
                emit();
            });
        }
    }
}
