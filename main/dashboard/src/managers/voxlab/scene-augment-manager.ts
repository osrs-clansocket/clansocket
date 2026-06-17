import { MeshStandardMaterial, type Material, type Mesh } from "three";
import type { FooterPanelComponent } from "../../dom/forms/voxlab/panels/footer-panel-component.js";
import type {
    AmbientFields,
    BackgroundFields,
    BloomFields,
    ChromaticAberrationFields,
    CoatSheenFields,
    ColorSpaceFields,
    ContrastFields,
    EmissiveFields,
    FillLightFields,
    GridAxesFields,
    KeyLightFields,
    OutlineFields,
    PixelRatioFields,
    QualityFields,
    SurfaceFields,
    TargetFpsFields,
    ToneExposureFields,
    VignetteFields,
} from "../../dom/forms/voxlab/sections/split-sections.js";
import {
    DEFAULT_BOTTOM_LIGHT,
    DEFAULT_ENVIRONMENT,
    DEFAULT_HEMISPHERE,
    DEFAULT_RIM_LIGHT,
    DEFAULT_TOP_LIGHT,
} from "../../shared/constants/voxlab/light-constants.js";
import type {
    BottomLightSettings,
    EnvironmentSettings,
    HemisphereSettings,
    RimLightSettings,
    TopLightSettings,
} from "../../shared/types/voxlab/light-types.js";
import type { CursorService } from "./services/cursor-service.js";
import { DEFAULT_CAMERA } from "../../shared/constants/voxlab/camera-constants.js";
import { DEFAULT_EFFECTS } from "../../shared/constants/voxlab/effect-constants.js";
import { DEFAULT_LIGHTING } from "../../shared/constants/voxlab/light-constants.js";
import { DEFAULT_MATERIAL_SETTINGS } from "../../shared/constants/voxlab/material-constants.js";
import { DEFAULT_MESH_SETTINGS } from "../../shared/constants/voxlab/mesh-settings-constants.js";
import { DEFAULT_MOTION } from "../../shared/constants/voxlab/motion-constants.js";
import type { CameraSettings } from "../../shared/types/voxlab/camera-types.js";
import type { EffectsSettings } from "../../shared/types/voxlab/effects-types.js";
import type { LightSettings } from "../../shared/types/voxlab/light-types.js";
import type { MaterialSettings } from "../../shared/types/voxlab/material-types.js";
import type { MeshSettings } from "../../shared/types/voxlab/mesh-settings-types.js";
import type { MotionSettings } from "../../shared/types/voxlab/motion-types.js";
import type { StressSettings } from "../../shared/types/voxlab/stress-types.js";
import { EffectsManager } from "./effects-manager.js";
import type { LightingManager } from "./lighting-manager.js";
import type { MeshManager } from "./mesh-manager.js";
import { MotionManager } from "./motion-manager.js";
import { StressShaderManager } from "./stress-shader-manager.js";
import type { ViewportManager } from "./viewport-manager.js";

const DEFAULT_STRESS: StressSettings = { enabled: false, radius: 0.6, lerp: 0.14, glowColor: "#f5ca7a" };

export class SceneAugmentManager {
    readonly effects: EffectsManager;
    readonly motion: MotionManager;
    readonly stress: StressShaderManager;
    // Renderer-facing aggregate state — composed from the split cards on each
    // change. The renderer side (EffectsManager / MeshManager / LightingManager)
    // continues to consume the unified types unchanged.
    private materialAggregate: MaterialSettings = { ...DEFAULT_MATERIAL_SETTINGS };
    private lightAggregate: LightSettings = { ...DEFAULT_LIGHTING };
    private effectsAggregate: EffectsSettings = { ...DEFAULT_EFFECTS };

    constructor(
        private readonly viewport: ViewportManager,
        private readonly meshes: MeshManager,
        cursor: CursorService,
        private readonly footer: FooterPanelComponent,
        private readonly lighting: LightingManager,
    ) {
        const stageBox = viewport.stage.getBoundingClientRect();
        this.effects = new EffectsManager(viewport.renderer, viewport.scene, viewport.camera, {
            width: Math.max(stageBox.width, 1),
            height: Math.max(stageBox.height, 1),
        });
        this.motion = new MotionManager(cursor);
        this.stress = new StressShaderManager(cursor);

        viewport.useEffects(this.effects);
        viewport.useMotion(this.motion);
        viewport.useStress(this.stress);
        viewport.setAnimatedGroup(meshes.meshGroup);
        this.stress.bind(viewport.camera);

        this.wireMeshEvents();
        this.wireFooterEvents();
    }

    private wireMeshEvents(): void {
        this.meshes.addEventListener("material-created", (e) => {
            const mat = (e as CustomEvent<Material>).detail;
            if (mat instanceof MeshStandardMaterial) {
                this.stress.inject(mat);
            }
        });
        this.meshes.addEventListener("mesh-loaded", (e) => {
            const mesh = (e as CustomEvent<Mesh>).detail;
            this.effects.setSelectedObjects([mesh]);
        });
    }

    private wireFooterEvents(): void {
        // ─── Surface (material) ──────────────────────────────────────
        this.footer.surface.addEventListener("surface-change", (e) => {
            Object.assign(this.materialAggregate, (e as CustomEvent<SurfaceFields>).detail);
            this.meshes.applyMaterialSettings(this.materialAggregate);
        });
        // flatShading moved from Surface (Color tab) to Shading (Light tab).
        // The Shading section emits shading-change with both smoothShading
        // and flatShading; voxlab-app-manager handles the smoothShading
        // rebuild flow, scene-augment writes flatShading into the material
        // aggregate so the renderer picks it up like any surface property.
        this.footer.shading.addEventListener("shading-change", (e) => {
            const detail = (e as CustomEvent<{ smoothShading: boolean; flatShading: boolean }>).detail;
            this.materialAggregate.flatShading = detail.flatShading;
            this.meshes.applyMaterialSettings(this.materialAggregate);
        });
        this.footer.emissive.addEventListener("emissive-change", (e) => {
            Object.assign(this.materialAggregate, (e as CustomEvent<EmissiveFields>).detail);
            this.meshes.applyMaterialSettings(this.materialAggregate);
        });
        this.footer.coatSheen.addEventListener("coat-sheen-change", (e) => {
            Object.assign(this.materialAggregate, (e as CustomEvent<CoatSheenFields>).detail);
            this.meshes.applyMaterialSettings(this.materialAggregate);
        });

        // ─── Lighting ────────────────────────────────────────────────
        this.footer.ambient.addEventListener("ambient-change", (e) => {
            Object.assign(this.lightAggregate, (e as CustomEvent<AmbientFields>).detail);
            this.lighting.applySettings(this.lightAggregate);
        });
        this.footer.keyLight.addEventListener("key-light-change", (e) => {
            Object.assign(this.lightAggregate, (e as CustomEvent<KeyLightFields>).detail);
            this.lighting.applySettings(this.lightAggregate);
        });
        this.footer.fillLight.addEventListener("fill-light-change", (e) => {
            Object.assign(this.lightAggregate, (e as CustomEvent<FillLightFields>).detail);
            this.lighting.applySettings(this.lightAggregate);
        });
        this.footer.environment.addEventListener("environment-change", (e) => {
            this.lighting.applyEnvironment((e as CustomEvent<EnvironmentSettings>).detail);
        });
        this.footer.hemisphere.addEventListener("hemisphere-change", (e) => {
            this.lighting.applyHemisphere((e as CustomEvent<HemisphereSettings>).detail);
        });
        this.footer.rimLight.addEventListener("rim-light-change", (e) => {
            this.lighting.applyRim((e as CustomEvent<RimLightSettings>).detail);
        });
        this.footer.topLight.addEventListener("top-light-change", (e) => {
            this.lighting.applyTop((e as CustomEvent<TopLightSettings>).detail);
        });
        this.footer.bottomLight.addEventListener("bottom-light-change", (e) => {
            this.lighting.applyBottom((e as CustomEvent<BottomLightSettings>).detail);
        });

        // ─── Background / Tone & Exposure / Grid ─────────────────────
        this.footer.background.addEventListener("background-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<BackgroundFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.toneExposure.addEventListener("tone-exposure-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<ToneExposureFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.gridAxes.addEventListener("grid-axes-change", (e) => {
            const s = (e as CustomEvent<GridAxesFields>).detail;
            this.effectsAggregate.gridColor = s.gridColor;
            this.effectsAggregate.gridSize = s.gridSize;
            this.effectsAggregate.gridDivisions = s.gridDivisions;
            this.effectsAggregate.gridFloorY = s.gridFloorY;
            this.effectsAggregate.axesLength = s.axesLength;
            this.viewport.setGridColor(s.gridColor);
            this.viewport.setGridSize(s.gridSize);
            this.viewport.setGridDivisions(s.gridDivisions);
            this.viewport.setGridFloorY(s.gridFloorY);
            this.viewport.setAxesLength(s.axesLength);
            this.viewport.setHelpersVisible(s.gridEnabled);
            this.effects.applySettings(this.effectsAggregate);
        });

        // ─── Camera ──────────────────────────────────────────────────
        this.footer.camera.addEventListener("camera-change", (e) => {
            this.applyCameraSettings((e as CustomEvent<CameraSettings>).detail);
        });

        // ─── Motion ──────────────────────────────────────────────────
        this.footer.motion.addEventListener("motion-change", (e) => {
            const settings = (e as CustomEvent<MotionSettings>).detail;
            this.motion.updateSettings(settings);
        });

        // ─── Render pipeline ─────────────────────────────────────────
        this.footer.quality.addEventListener("quality-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<QualityFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.bloom.addEventListener("bloom-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<BloomFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.outline.addEventListener("outline-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<OutlineFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.vignette.addEventListener("vignette-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<VignetteFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.contrast.addEventListener("contrast-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<ContrastFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.chromaticAberration.addEventListener("chromatic-aberration-change", (e) => {
            Object.assign(this.effectsAggregate, (e as CustomEvent<ChromaticAberrationFields>).detail);
            this.effects.applySettings(this.effectsAggregate);
        });
        this.footer.pixelRatio.addEventListener("pixel-ratio-change", (e) => {
            const detail = (e as CustomEvent<PixelRatioFields>).detail;
            this.viewport.setPixelRatio(detail.pixelRatio);
        });
        this.footer.targetFps.addEventListener("target-fps-change", (e) => {
            const detail = (e as CustomEvent<TargetFpsFields>).detail;
            this.viewport.setTargetFps(detail.targetFps);
        });
        this.footer.colorSpace.addEventListener("color-space-change", (e) => {
            const detail = (e as CustomEvent<ColorSpaceFields>).detail;
            this.viewport.setColorSpace(detail.colorSpace);
        });
        this.footer.stress.addEventListener("stress-change", (e) => {
            this.stress.updateSettings((e as CustomEvent<StressSettings>).detail);
        });

        // ─── Mesh (geometry runtime — bake-time options handled in voxlab-app-manager) ─
        this.footer.mesh.addEventListener("mesh-change", (e) => {
            this.applyMeshSettings((e as CustomEvent<MeshSettings>).detail);
        });

        // ─── Reset all ──────────────────────────────────────────────
        this.footer.addEventListener("reset-all", () => {
            this.materialAggregate = { ...DEFAULT_MATERIAL_SETTINGS };
            this.lightAggregate = { ...DEFAULT_LIGHTING };
            this.effectsAggregate = { ...DEFAULT_EFFECTS };
            this.meshes.applyMaterialSettings(this.materialAggregate);
            this.lighting.applySettings(this.lightAggregate);
            this.lighting.applyEnvironment({ ...DEFAULT_ENVIRONMENT });
            this.lighting.applyHemisphere({ ...DEFAULT_HEMISPHERE });
            this.lighting.applyRim({ ...DEFAULT_RIM_LIGHT });
            this.lighting.applyTop({ ...DEFAULT_TOP_LIGHT });
            this.lighting.applyBottom({ ...DEFAULT_BOTTOM_LIGHT });
            this.effects.applySettings(this.effectsAggregate);
            this.motion.updateSettings({ ...DEFAULT_MOTION });
            this.stress.updateSettings({ ...DEFAULT_STRESS });
            this.applyCameraSettings({ ...DEFAULT_CAMERA });
            this.applyMeshSettings({ ...DEFAULT_MESH_SETTINGS });
        });
    }

    private applyMeshSettings(settings: MeshSettings): void {
        this.meshes.setUniformScale(settings.scale);
    }

    private applyCameraSettings(settings: CameraSettings): void {
        this.viewport.setFov(settings.fov);
        this.viewport.setNear(settings.near);
        this.viewport.setFar(settings.far);
        this.viewport.setDampingFactor(settings.dampingFactor);
        this.viewport.setCameraPosition(settings.positionX, settings.positionY, settings.positionZ);
        this.viewport.setCameraTarget(settings.targetX, settings.targetY, settings.targetZ);
    }
}
