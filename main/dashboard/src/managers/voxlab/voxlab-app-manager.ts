import gifWorkerUrl from "gif.js/dist/gif.worker.js?url";
import { Raycaster, Vector2 } from "three";

// Module-level scratch objects so we don't allocate per dblclick.
const stressRaycaster = new Raycaster();
const stressNdc = new Vector2();
import type { BakeRequest, CaptureRequest } from "../../dom/forms/voxlab/panels/export-panel-component.js";
import { FooterPanelComponent } from "../../dom/forms/voxlab/panels/footer-panel-component.js";
import { OverlayComponent } from "../../dom/forms/voxlab/panels/overlay-component.js";
import { SidebarComponent } from "../../dom/forms/voxlab/panels/sidebar-component.js";
import { TimelinePanelComponent } from "../../dom/forms/voxlab/panels/timeline-panel-component.js";
import type { CameraIntent } from "../../dom/forms/voxlab/sections/camera-section-component.js";
import type { ShadingFields, ShadowsFields, WireframeFields } from "../../dom/forms/voxlab/sections/split-sections.js";
import type {
    AlbedoChangeEventDetail,
    PbrGenerateEventDetail,
    PbrMapSlot,
    PbrMapsChangeEventDetail,
    PbrMapsSettings,
} from "../../shared/types/voxlab/paint-types.js";
import { PBR_SLOT_ORDER } from "../../shared/constants/voxlab/texture-paint-constants.js";
import { formatMeshAsJson } from "../../voxlab/formatters/mesh-formatter.js";
import { luminanceMapper } from "../../voxlab/mappers/luminance-mapper.js";
import { localContrastMapper } from "../../voxlab/mappers/local-contrast-mapper.js";
import { sobelMapper } from "../../voxlab/mappers/sobel-mapper.js";
import { thresholdMapper } from "../../voxlab/mappers/threshold-mapper.js";
import { CaptureService } from "./services/capture-service.js";
import { CursorService } from "./services/cursor-service.js";
import { FileService } from "./services/file-service.js";
import { ActionsPanelComponent } from "../../dom/forms/voxlab/panels/actions-panel-component.js";
import { AnimationsPanelComponent } from "../../dom/forms/voxlab/panels/animations-panel-component.js";
import { PresetsPanelComponent } from "../../dom/forms/voxlab/panels/presets-panel-component.js";
import { LightPanelComponent } from "../../dom/forms/voxlab/panels/light-panel-component.js";
import { HistoryService } from "./services/history-service.js";
import { KeyframeRecorderService } from "./services/keyframe-recorder-service.js";
import { modalService } from "./services/modal-service.js";
import { PersistenceService } from "./services/persistence-service.js";
import { PresetStorageService } from "./services/preset-storage-service.js";
import { applyByPath, readByPath } from "../../voxlab/timeline/property-paths.js";
import type { MeshData } from "../../shared/types/voxlab/mesh-types.js";
import { TIMELINE_SCHEMA_VERSION, type Timeline } from "../../shared/types/voxlab/timeline-types.js";
import type { PublishPayload, VoxlabEditorInitialState } from "./voxlab-editor.js";
import { MeshManager } from "./mesh-manager.js";
import { SceneAugmentManager } from "./scene-augment-manager.js";
import { BakerManager } from "./baker-manager.js";
import { LayoutManager } from "./layout-manager.js";
import { LightingManager } from "./lighting-manager.js";
import { SnapshotManager } from "./snapshot-manager.js";
import { TexturePaintManager } from "./texture-paint-manager.js";
import { TimelineManager } from "./timeline-manager.js";
import { ViewportManager } from "./viewport-manager.js";
import {
    STAGE_CANVAS_CLASS,
    STAGE_CLASS,
    TIMELINE_CENTER_COLUMN_CLASS,
    VOXLAB_PAGE_CLASS,
} from "../../shared/constants/voxlab/voxlab-classes-constants.js";

const DEFAULT_TIMELINE_PX = 160;
const MIN_TIMELINE_PX = 80;
const MAX_TIMELINE_PCT = 0.7;
const PUBLISH_THUMBNAIL_PX = 512;

export interface VoxlabAppManagerConfig {
    onPublish?: (payload: PublishPayload) => void;
    onReloadRequested?: () => void;
}

export class VoxlabAppManager {
    private readonly stage: HTMLDivElement;
    private readonly centerColumn: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly sidebar = new SidebarComponent();
    private readonly footer = new FooterPanelComponent();
    private readonly timelinePanel = new TimelinePanelComponent();
    private readonly overlays = new OverlayComponent();
    private readonly fileService = new FileService();
    private readonly cursorService = new CursorService();
    private readonly viewport: ViewportManager;
    private readonly meshes: MeshManager;
    readonly augment: SceneAugmentManager;
    readonly lighting: LightingManager;
    readonly snapshot: SnapshotManager;
    readonly texturePaint: TexturePaintManager;
    readonly capture: CaptureService;
    readonly timeline: TimelineManager;
    readonly baker: BakerManager;
    readonly recorder: KeyframeRecorderService;
    readonly layout = new LayoutManager();
    private readonly persistence = new PersistenceService();
    private readonly presetStorage = new PresetStorageService();
    private readonly history = new HistoryService();
    private readonly presetsPanel: PresetsPanelComponent;
    private readonly actionsPanel: ActionsPanelComponent;
    private readonly lightPanel: LightPanelComponent;
    private readonly animationsPanel: AnimationsPanelComponent;
    private readonly config: VoxlabAppManagerConfig;
    private persistedRestored = false;
    private hostManagedState = false;
    private settingsSaveTimer: number | null = null;
    // Track smoothShading state to gate the async rebuild — only fire it
    // when smoothShading actually toggled, not when sibling flatShading did.
    private lastSmoothShading = false;

    constructor(root: HTMLElement, config: VoxlabAppManagerConfig = {}) {
        this.config = config;
        root.classList.add(VOXLAB_PAGE_CLASS);
        this.footer.mount(root);

        this.centerColumn = document.createElement("div");
        this.centerColumn.className = TIMELINE_CENTER_COLUMN_CLASS;
        this.centerColumn.style.setProperty("--timeline-height", `${DEFAULT_TIMELINE_PX}px`);

        this.stage = document.createElement("div");
        this.stage.className = STAGE_CLASS;
        this.canvas = document.createElement("canvas");
        this.canvas.className = STAGE_CANVAS_CLASS;
        this.stage.appendChild(this.canvas);
        this.centerColumn.appendChild(this.stage);

        const resizer = document.createElement("div");
        resizer.className = "voxlab-timeline-resizer";
        resizer.setAttribute("role", "separator");
        resizer.setAttribute("aria-orientation", "horizontal");
        this.centerColumn.appendChild(resizer);
        this.wireTimelineResizer(resizer);

        this.timelinePanel.mount(this.centerColumn);
        root.appendChild(this.centerColumn);

        this.overlays.mount(this.stage);
        this.sidebar.mount(root);

        this.viewport = new ViewportManager(this.stage, this.canvas, this.cursorService);
        this.meshes = new MeshManager(this.viewport.scene);
        this.lighting = new LightingManager(this.viewport.scene, this.viewport.renderer);
        this.augment = new SceneAugmentManager(
            this.viewport,
            this.meshes,
            this.cursorService,
            this.footer,
            this.lighting,
        );
        this.texturePaint = new TexturePaintManager(
            this.meshes,
            this.footer,
            this.footer.registry,
            this.viewport,
            this.canvas,
        );
        this.snapshot = new SnapshotManager(this.footer.registry);
        this.capture = new CaptureService(this.viewport);
        this.timeline = new TimelineManager({ snapshot: this.snapshot, registry: this.footer.registry });
        this.baker = new BakerManager({ timeline: this.timeline, capture: this.capture, viewport: this.viewport });
        this.recorder = new KeyframeRecorderService(this.timeline, this.snapshot);
        this.timelinePanel.bind(this.timeline);
        this.timeline.addEventListener("timeline-loaded", () => {
            this.centerColumn.dataset.timelineActive = "true";
        });
        this.timeline.addEventListener("timeline-unloaded", () => {
            delete this.centerColumn.dataset.timelineActive;
        });
        this.timeline.addEventListener("timeline-seek", () => {
            this.recorder.refreshBaseline();
        });
        this.wireRecorderListeners();
        // Timeline is loaded by default — the start/stop button became a
        // keyframe tracking toggle (recorder.setEnabled), not a timeline
        // existence toggle. Recorder starts disabled so static editing is
        // the default; user toggles tracking on via the export panel.
        this.timeline.load(this.buildStubTimeline());

        this.presetsPanel = new PresetsPanelComponent({
            storage: this.presetStorage,
            onApply: (detail) => this.applyPresetSnapshot(detail.snapshot),
            onSaveCurrent: () => this.snapshot.capture(),
        });
        this.presetsPanel.mount(this.footer.presetsContainer);

        this.lightPanel = new LightPanelComponent({
            lighting: this.lighting,
            onHdrChanged: () => this.scheduleSettingsSave(),
            sections: this.footer.lightSections,
        });
        this.lightPanel.mount(this.footer.lightContainer);

        for (const section of this.footer.cameraSections) {
            section.mount(this.sidebar.cameraContainer);
        }
        for (const section of this.footer.sceneSections) {
            section.mount(this.sidebar.sceneContainer);
        }
        for (const section of this.footer.displaySections) {
            section.mount(this.sidebar.displayContainer);
        }
        for (const section of this.footer.meshSections) {
            section.mount(this.footer.meshContainer);
        }
        this.sidebar.statsPanel.mount(this.footer.meshContainer);
        for (const section of this.footer.colorSections) {
            section.mount(this.footer.colorContainer);
        }
        for (const section of this.footer.textureSections) {
            section.mount(this.footer.textureContainer);
        }

        this.animationsPanel = new AnimationsPanelComponent({
            getSnapshot: () => this.snapshot.capture(),
            getActivePresetIds: () => this.timeline.getActivePresetIds(),
            getTimelineDurationMs: () => this.timeline.durationMs,
            getCursorMs: () => this.timeline.currentTimeMs,
            hasTimeline: () => this.timeline.hasTimeline(),
            applyPreset: (preset, durationMs, cursorOffsetMs) => {
                const snap = this.snapshot.capture();
                const tracks = preset.generate({ snapshot: snap, durationMs });
                this.timeline.applyPresetKeyframes(preset.id, snap, durationMs, cursorOffsetMs, tracks);
            },
            removePreset: (presetId) => this.timeline.removePresetKeyframes(presetId),
            addTimelineListener: (type, listener) => this.timeline.addEventListener(type, listener),
            removeTimelineListener: (type, listener) => this.timeline.removeEventListener(type, listener),
        });
        this.animationsPanel.mount(this.footer.animationsContainer);

        this.actionsPanel = new ActionsPanelComponent({
            history: this.history,
            getSnapshot: () => this.snapshot.capture(),
            onUndo: () => this.performUndo(),
            onRedo: () => this.performRedo(),
            onResetPath: (path) => this.performResetPath(path),
            onClearAll: () => this.performClearAll(),
        });
        this.actionsPanel.mount(this.sidebar.actionsContainer);

        // History baseline = the defaults snapshot the sections were born with.
        // Any restore from persistence runs AFTER this, so the diffs land as
        // recordable entries the user can undo / reset.
        this.history.initialize(this.snapshot.capture());

        this.wireSidebarEvents();
        this.wireSectionEvents();
        this.registerLayoutPanels();
        this.layout.attach({
            left: this.footer.panelsContainer,
            right: document.createElement("div"),
        });
        this.viewport.addEventListener("rebuild-requested", () => {
            this.meshes.rebuild(this.footer.wireframe.current.enabled);
        });
        this.viewport.addEventListener("fps-update", (e) => {
            this.footer.targetFps.updateRealtimeFps((e as CustomEvent<number>).detail);
        });
        this.viewport.addEventListener("aspect-change", () => {
            const box = this.meshes.mesh?.geometry.boundingBox ?? null;
            if (box) {
                this.viewport.resetCamera(box, this.footer.camera.current.fitDistanceMultiplier);
            }
        });

        this.wireStressAnchor();
        this.wireAlbedoEvents();
        this.wirePbrMapsEvents();
        this.wirePbrGenerationEvents();
        this.wirePaintExportEvents();
    }

    private wirePaintExportEvents(): void {
        this.footer.paint.addEventListener("paint-export", () => {
            this.runPaintExport();
        });
    }

    private runPaintExport(): void {
        const meshData = this.meshes.exportPaintedMesh();
        if (!meshData) {
            console.warn("[voxlab] paint-export: no mesh loaded");
            return;
        }
        const json = formatMeshAsJson(meshData);
        const blob = new Blob([json], { type: "application/json" });
        this.fileService.saveBlob(blob, `${this.exportStem()}-painted.json`);
    }

    private wirePbrGenerationEvents(): void {
        this.footer.pbrGeneration.addEventListener("pbr-generate", (e) => {
            const detail = (e as CustomEvent<PbrGenerateEventDetail>).detail;
            void this.runPbrGeneration(detail);
        });
    }

    private async runPbrGeneration(channels: PbrGenerateEventDetail): Promise<void> {
        // Try uploaded albedo first, fall back to the mesh's retained source
        // image. The default workflow (drop image → convert → mesh) never
        // touches the upload picker, so requiring uploadedDataUrl made the
        // Generate button a silent no-op for almost every user.
        const imageData = await this.resolvePbrSourceImageData();
        if (!imageData) {
            console.warn("[voxlab] pbr-generate: no albedo (uploaded or source-image) to derive from");
            return;
        }
        try {
            const next: PbrMapsSettings = { ...this.footer.pbrMaps.current };
            if (channels.normal) {
                next.normal = imageDataToDataUrl(sobelMapper(imageData, channels.sobelStrength));
            }
            if (channels.roughness) {
                next.roughness = imageDataToDataUrl(luminanceMapper(imageData, true));
            }
            if (channels.metalness) {
                next.metalness = imageDataToDataUrl(thresholdMapper(imageData, channels.metalnessThreshold));
            }
            if (channels.ao) {
                next.ao = imageDataToDataUrl(localContrastMapper(imageData, channels.aoRadius));
            }
            this.footer.pbrMaps.apply(next);
        } catch (err) {
            console.warn("[voxlab] pbr-generate failed", err);
        }
    }

    private async resolvePbrSourceImageData(): Promise<ImageData | null> {
        const uploadedUrl = this.footer.albedo.current.uploadedDataUrl;
        if (uploadedUrl) {
            try {
                const blob = await (await fetch(uploadedUrl)).blob();
                const bitmap = await createImageBitmap(blob);
                const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    return null;
                }
                ctx.drawImage(bitmap, 0, 0);
                return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
            } catch (err) {
                console.warn("[voxlab] pbr-generate: uploaded albedo decode failed, falling back", err);
            }
        }
        const sourcePixels = this.meshes.sourceImagePixels;
        if (!sourcePixels) {
            return null;
        }
        return new ImageData(new Uint8ClampedArray(sourcePixels.data), sourcePixels.width, sourcePixels.height);
    }

    private wirePbrMapsEvents(): void {
        const appliedUrls: Record<PbrMapSlot, string | null> = {
            normal: null,
            roughness: null,
            metalness: null,
            ao: null,
        };
        this.footer.pbrMaps.addEventListener("pbr-maps-change", (e) => {
            const detail = (e as CustomEvent<PbrMapsChangeEventDetail>).detail;
            for (const slot of PBR_SLOT_ORDER) {
                const url = detail[slot];
                if (url === appliedUrls[slot]) {
                    continue;
                }
                appliedUrls[slot] = url;
                if (url === null) {
                    this.meshes.setPbrMap(slot, null);
                } else {
                    void this.applyPbrDataUrl(slot, url);
                }
            }
            this.meshes.setPbrIntensity("normal", detail.normalScale);
            this.meshes.setPbrIntensity("roughness", detail.roughnessIntensity);
            this.meshes.setPbrIntensity("metalness", detail.metalnessIntensity);
            this.meshes.setPbrIntensity("ao", detail.aoIntensity);
        });
    }

    private async applyPbrDataUrl(slot: PbrMapSlot, dataUrl: string): Promise<void> {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const bitmap = await createImageBitmap(blob);
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }
            ctx.drawImage(bitmap, 0, 0);
            const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
            this.meshes.setPbrMap(slot, {
                data: imageData.data,
                width: imageData.width,
                height: imageData.height,
            });
        } catch (err) {
            console.warn(`[voxlab] pbr ${slot} decode failed`, err);
        }
    }

    private wireAlbedoEvents(): void {
        this.footer.albedo.addEventListener("albedo-change", (e) => {
            const detail = (e as CustomEvent<AlbedoChangeEventDetail>).detail;
            if (detail.source === "source-image") {
                const pixels = this.meshes.sourceImagePixels;
                if (pixels) {
                    this.meshes.setSourceTexture(pixels);
                    this.meshes.setTextureEnabled(true);
                } else {
                    console.warn("[voxlab] albedo source-image: no original ImagePixels retained");
                }
            } else if (detail.source === "uploaded" && detail.uploadedDataUrl) {
                void this.applyAlbedoDataUrl(detail.uploadedDataUrl);
            } else {
                this.meshes.setTextureEnabled(false);
                this.meshes.setSourceTexture(null);
            }
        });
    }

    private async applyAlbedoDataUrl(dataUrl: string): Promise<void> {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const bitmap = await createImageBitmap(blob);
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }
            ctx.drawImage(bitmap, 0, 0);
            const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
            this.meshes.setSourceTexture({
                data: imageData.data,
                width: imageData.width,
                height: imageData.height,
            });
            this.meshes.setTextureEnabled(true);
        } catch (err) {
            console.warn("[voxlab] albedo decode failed", err);
        }
    }

    private wireStressAnchor(): void {
        this.canvas.addEventListener("dblclick", (ev) => {
            if (!this.footer.stress.current.enabled) {
                return;
            }
            const mesh = this.meshes.mesh;
            if (!mesh) {
                return;
            }
            const rect = this.canvas.getBoundingClientRect();
            const ndcX = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            const ndcY = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
            stressNdc.set(ndcX, ndcY);
            stressRaycaster.setFromCamera(stressNdc, this.viewport.camera);
            const hits = stressRaycaster.intersectObject(mesh, true);
            if (hits.length > 0) {
                this.augment.stress.setAnchor(hits[0].point);
            } else {
                // Double-clicking empty space releases the anchor — easy way
                // to drop back to cursor-follow without toggling stress off.
                this.augment.stress.setAnchor(null);
            }
        });
    }

    private wireRecorderListeners(): void {
        const handler = (): void => {
            this.recorder.recordChange();
            this.scheduleSettingsSave();
        };
        const events: Array<[EventTarget, string]> = [
            [this.footer.surface, "surface-change"],
            [this.footer.emissive, "emissive-change"],
            [this.footer.coatSheen, "coat-sheen-change"],
            [this.footer.wireframe, "wireframe-change"],
            [this.footer.shading, "shading-change"],
            [this.footer.shadows, "shadows-change"],
            [this.footer.ambient, "ambient-change"],
            [this.footer.keyLight, "key-light-change"],
            [this.footer.fillLight, "fill-light-change"],
            [this.footer.environment, "environment-change"],
            [this.footer.hemisphere, "hemisphere-change"],
            [this.footer.rimLight, "rim-light-change"],
            [this.footer.topLight, "top-light-change"],
            [this.footer.bottomLight, "bottom-light-change"],
            [this.footer.background, "background-change"],
            [this.footer.toneExposure, "tone-exposure-change"],
            [this.footer.gridAxes, "grid-axes-change"],
            [this.footer.camera, "camera-change"],
            [this.footer.motion, "motion-change"],
            [this.footer.quality, "quality-change"],
            [this.footer.bloom, "bloom-change"],
            [this.footer.outline, "outline-change"],
            [this.footer.vignette, "vignette-change"],
            [this.footer.contrast, "contrast-change"],
            [this.footer.chromaticAberration, "chromatic-aberration-change"],
            [this.footer.pixelRatio, "pixel-ratio-change"],
            [this.footer.targetFps, "target-fps-change"],
            [this.footer.colorSpace, "color-space-change"],
            [this.footer.stress, "stress-change"],
            [this.footer.mesh, "mesh-change"],
            [this.footer.parts, "parts-section-change"],
            [this.footer.parts, "parts-fill"],
            [this.footer.parts, "parts-reset"],
            [this.footer.paint, "brush-change"],
            [this.footer.paint, "paint-clear-all"],
            [this.footer.gradient, "gradient-change"],
            [this.footer.gradient, "gradient-apply"],
            [this.footer.albedo, "albedo-change"],
            [this.footer.pbrMaps, "pbr-maps-change"],
            [this.footer.pbrGeneration, "pbr-generation-change"],
            [this.footer.pbrGeneration, "pbr-generate"],
            [this.texturePaint, "paint-state-change"],
        ];
        for (const [target, evt] of events) {
            target.addEventListener(evt, handler);
        }
        this.viewport.controls.addEventListener("change", () => this.onCameraControlsChanged());
    }

    private wireSectionEvents(): void {
        this.footer.wireframe.addEventListener("wireframe-change", (e) => {
            const detail = (e as CustomEvent<WireframeFields>).detail;
            this.meshes.setWireframeColor(detail.color);
            this.meshes.setWireframeOpacity(detail.opacity);
            if (detail.enabled) {
                this.meshes.showWireframe();
            } else {
                this.meshes.hideWireframe();
            }
        });
        this.footer.shading.addEventListener("shading-change", (e) => {
            const detail = (e as CustomEvent<ShadingFields>).detail;
            if (detail.smoothShading === this.lastSmoothShading) {
                return;
            }
            this.lastSmoothShading = detail.smoothShading;
            void this.handleShadingChange(detail.smoothShading);
        });
        this.footer.shadows.addEventListener("shadows-change", (e) => {
            const detail = (e as CustomEvent<ShadowsFields>).detail;
            this.applyShadows(detail.enabled);
        });
        this.footer.camera.addEventListener("camera-intent", (e) => {
            this.handleCameraIntent((e as CustomEvent<CameraIntent>).detail);
        });
        this.footer.mesh.addEventListener("mesh-reload", () => {
            this.config.onReloadRequested?.();
        });
    }

    private scheduleSettingsSave(): void {
        if (!this.persistedRestored || this.snapshot.isRestoring || this.hostManagedState) {
            return;
        }
        if (this.settingsSaveTimer !== null) {
            clearTimeout(this.settingsSaveTimer);
        }
        this.settingsSaveTimer = window.setTimeout(() => {
            this.settingsSaveTimer = null;
            if (this.snapshot.isRestoring) {
                return;
            }
            const snap = this.snapshot.capture();
            this.persistence.saveSettings(snap);
            this.history.record(snap);
        }, 300);
    }

    private performUndo(): void {
        const entry = this.history.popUndo();
        if (!entry) {
            return;
        }
        this.applyHistoryValue(entry.path, entry.prevValue);
    }

    private performRedo(): void {
        const entry = this.history.popRedo();
        if (!entry) {
            return;
        }
        this.applyHistoryValue(entry.path, entry.nextValue);
    }

    private performResetPath(path: string): void {
        const baseline = this.history.getBaseline();
        if (!baseline) {
            return;
        }
        const defaultValue = readByPath(baseline, path);
        if (defaultValue === undefined) {
            return;
        }
        const current = this.snapshot.capture();
        applyByPath(current, path, defaultValue);
        this.history.resetPathEntries(path);
        this.history.suspend();
        this.snapshot.restore(current);
        this.history.resume();
        this.history.syncPrevious(current);
        if (this.persistedRestored && !this.hostManagedState) {
            this.persistence.saveSettings(current);
        }
    }

    private performClearAll(): void {
        const baseline = this.history.getBaseline();
        if (!baseline) {
            return;
        }
        this.history.suspend();
        this.snapshot.restore(baseline);
        this.history.resume();
        this.history.clearAll();
        this.history.syncPrevious(baseline);
        if (this.persistedRestored && !this.hostManagedState) {
            this.persistence.saveSettings(baseline);
        }
    }

    private applyHistoryValue(path: string, value: unknown): void {
        const current = this.snapshot.capture();
        applyByPath(current, path, value);
        this.history.suspend();
        this.snapshot.restore(current);
        this.history.resume();
        this.history.syncPrevious(current);
        if (this.persistedRestored && !this.hostManagedState) {
            this.persistence.saveSettings(current);
        }
    }

    private onCameraControlsChanged(): void {
        if (this.snapshot.isRestoring) {
            return;
        }
        const camera = this.viewport.camera;
        const target = this.viewport.controls.target;
        const existing = this.footer.camera.current;
        this.footer.camera.syncFrom({
            ...existing,
            fov: camera.fov,
            near: camera.near,
            far: camera.far,
            positionX: camera.position.x,
            positionY: camera.position.y,
            positionZ: camera.position.z,
            targetX: target.x,
            targetY: target.y,
            targetZ: target.z,
        });
        if (this.timeline.hasTimeline()) {
            this.recorder.recordChange();
        }
        this.scheduleSettingsSave();
    }

    private registerLayoutPanels(): void {
        for (const { id, title, component } of this.footer.sectionsInOrder) {
            this.layout.register({ id, title, component, defaultSide: "left" });
        }
    }

    start(): void {
        // Snapshot the authored camera BEFORE viewport.start runs. viewport.start
        // sets camera.position to the default via resetCamera(null) and then
        // synchronously runs tick() → controls.update() in the same call.
        // controls.update sees the position changed from lastPosition and
        // dispatches OrbitControls' "change" event, which onCameraControlsChanged
        // consumes and writes the viewport's (default) state INTO footer.camera
        // via syncFrom. Reading current AFTER viewport.start therefore returns
        // the default — losing the authored state restored in applyInitial.
        // Capture it here, then push it back via applyCameraExact.
        const authoredCamera = this.hostManagedState ? this.footer.camera.current : null;
        this.viewport.start();
        if (authoredCamera) {
            this.viewport.applyCameraExact(authoredCamera);
        }
        void this.restorePersisted();
    }

    /**
     * Apply host-provided initial state. Called by VoxlabEditor.mount() before
     * `start()`. Sets the hostManagedState flag so persisted localStorage
     * settings are NOT restored (host owns state in embedded mode) and
     * scheduleSettingsSave is suppressed (no leakage back to localStorage).
     *
     * Apply order: mesh first (so material/lighting in the snapshot lands on
     * a real mesh), snapshot second, timeline third (timeline tracks may
     * override snapshot values at cursor=0, so timeline wins on collision).
     */
    applyInitial(initial: VoxlabEditorInitialState): void {
        this.hostManagedState = true;
        if (initial.mesh) {
            this.applyMesh(initial.mesh, "host-mesh", 0);
        }
        if (initial.snapshot) {
            this.snapshot.restore(initial.snapshot);
        }
        if (initial.timeline) {
            this.timeline.load(initial.timeline);
        }
        // timeline.load → seek(0) restores animated parts to their t=0
        // keyframe values, which overrides the snapshot.restore for any
        // parts also covered by tracks. Camera is the common victim — the
        // orbit-recorder auto-adds camera tracks while tracking is on, so
        // a re-edit's seek(0) resets the camera to the t=0 keyframe instead
        // of the user's authored static position. Re-apply the snapshot's
        // camera AFTER timeline.load so the static authored state wins on
        // initial open.
        const snapshotCamera = initial.snapshot?.parts?.camera;
        if (snapshotCamera) {
            this.footer.camera.apply(snapshotCamera as Parameters<typeof this.footer.camera.apply>[0]);
        }
        // Refresh the undo baseline so the host-provided state IS the floor —
        // user can't undo back into pre-host defaults.
        this.history.initialize(this.snapshot.capture());
    }

    /**
     * Build a PublishPayload envelope: current mesh + current snapshot +
     * current timeline + a square transparent 512×512 thumbnail PNG baked
     * from the live scene. Throws if no mesh is loaded — UI gates the
     * sidebar button, this guards the programmatic path.
     */
    async publish(): Promise<PublishPayload> {
        const mesh = this.meshes.exportPaintedMesh();
        if (!mesh) {
            throw new Error("VoxlabAppManager.publish: no mesh loaded");
        }
        const timeline = this.timeline.getTimeline();
        if (!timeline) {
            throw new Error("VoxlabAppManager.publish: timeline missing");
        }
        this.sidebar.setPublishBusy(true);
        await this.overlays.showBusy("Publishing…");
        try {
            // Capture the snapshot BEFORE seeking to frame 0. seek(0) would
            // apply t=0 keyframe values to any animated parts, which would
            // overwrite the user's authored static state.
            const captured = this.snapshot.capture();
            // DIRECT WRITE of the live Three.js camera into the captured
            // snapshot's camera part. Bypasses every indirection so the
            // user's current orbit position is what gets saved, regardless
            // of section-sync timing.
            const liveCam = this.viewport.camera;
            const liveTarget = this.viewport.controls.target;
            const existingCam = (captured.parts.camera ?? {}) as Record<string, unknown>;
            captured.parts.camera = {
                ...existingCam,
                fov: liveCam.fov,
                near: liveCam.near,
                far: liveCam.far,
                positionX: liveCam.position.x,
                positionY: liveCam.position.y,
                positionZ: liveCam.position.z,
                targetX: liveTarget.x,
                targetY: liveTarget.y,
                targetZ: liveTarget.z,
            };
            this.timeline.pause();
            this.timeline.seek(0);
            const thumbnail = await this.baker.bakeFrame({
                format: "png",
                width: PUBLISH_THUMBNAIL_PX,
                height: PUBLISH_THUMBNAIL_PX,
                transparent: true,
            });
            // Background is editor-only authoring state (visual reference for
            // the user while composing the model). Strip from the published
            // envelope — display renderers always want transparent.
            const cleanParts: Record<string, unknown> = {};
            for (const [name, state] of Object.entries(captured.parts)) {
                if (name === "background") continue;
                if (name === "paint") continue;
                cleanParts[name] = state;
            }
            // Strip timeline tracks if the recorder is disabled at publish.
            // Tracking off = "save my current static state, no animation".
            // Tracking on = "I'm actively authoring animation". This keeps
            // stale orbit-auto-recorded tracks from overriding the captured
            // snapshot at renderer mount (timeline.load → seek(0) resets
            // animated parts to t=0 keyframe values, overriding the
            // snapshot's authored static position).
            const isAuthoringAnimation = this.recorder.isEnabled();
            const publishedTimeline = isAuthoringAnimation ? timeline : { ...timeline, tracks: [] };
            const payload: PublishPayload = {
                payloadVersion: 1,
                mesh,
                snapshot: { ...captured, parts: cleanParts },
                timeline: publishedTimeline,
                thumbnailPng: thumbnail.blob,
            };
            return payload;
        } finally {
            this.overlays.hideBusy();
            this.sidebar.setPublishBusy(false);
        }
    }

    private async restorePersisted(): Promise<void> {
        try {
            if (this.hostManagedState) {
                return;
            }
            const settings = this.persistence.loadSettings();
            if (settings) {
                this.snapshot.restore(settings);
                this.history.record(this.snapshot.capture());
            }
        } catch (err) {
            console.warn("[voxlab] restore failed", err);
        } finally {
            this.persistedRestored = true;
        }
    }

    private wireSidebarEvents(): void {
        this.sidebar.addEventListener("publish-requested", () => {
            void this.runPublish();
        });
        this.sidebar.exportPanel.addEventListener("capture-requested", (e) => {
            void this.runCapture((e as CustomEvent<CaptureRequest>).detail);
        });
        this.sidebar.exportPanel.addEventListener("bake-requested", (e) => {
            void this.runBake((e as CustomEvent<BakeRequest>).detail);
        });
        this.timelinePanel.addEventListener("toggle-tracking-requested", () => {
            this.runToggleTracking();
        });
    }

    private async runPublish(): Promise<void> {
        try {
            const payload = await this.publish();
            this.config.onPublish?.(payload);
        } catch (err) {
            void modalService.alert(`Publish failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private applyPresetSnapshot(snapshot: {
        schemaVersion: number;
        capturedAt: number;
        parts: Record<string, unknown>;
    }): void {
        this.snapshot.restore(snapshot as Parameters<typeof this.snapshot.restore>[0]);
        const captured = this.snapshot.capture();
        this.history.record(captured);
        if (this.persistedRestored && !this.hostManagedState) {
            this.persistence.saveSettings(captured);
        }
    }

    private applyMesh(meshData: MeshData, fileName: string, fileSize: number): void {
        const mesh = this.meshes.loadMesh(meshData, this.footer.wireframe.current.enabled);
        this.overlays.hideEmpty();
        this.sidebar.statsPanel.update(meshData, fileName, fileSize);
        this.sidebar.setExportEnabled(true);
        this.sidebar.setPublishEnabled(true);
        if (mesh.geometry.boundingBox) {
            this.viewport.resetCamera(mesh.geometry.boundingBox);
        }
    }

    private applyShadows(enabled: boolean): void {
        this.viewport.setShadowsEnabled(enabled);
        this.lighting.setShadowsEnabled(enabled);
        this.meshes.setShadowsEnabled(enabled);
    }

    private async handleShadingChange(smoothShading: boolean): Promise<void> {
        this.meshes.setSmoothShading(smoothShading);
        if (!this.meshes.meshData) {
            return;
        }
        await this.overlays.showBusy(smoothShading ? "Smoothing…" : "Flattening…");
        try {
            this.meshes.rebuild(this.footer.wireframe.current.enabled);
        } finally {
            this.overlays.hideBusy();
        }
    }

    private handleCameraIntent(intent: CameraIntent): void {
        const camera = this.footer.camera.current;
        if (intent === "reset") {
            this.viewport.resetCamera(this.meshes.mesh?.geometry.boundingBox ?? null, camera.fitDistanceMultiplier);
            return;
        }
        if (intent === "front" && this.meshes.mesh) {
            this.viewport.frontView(this.meshes.mesh, camera.frontDistanceMultiplier);
        }
    }

    private wireTimelineResizer(handle: HTMLElement): void {
        let active = false;
        let startY = 0;
        let startHeight = DEFAULT_TIMELINE_PX;
        handle.addEventListener("pointerdown", (e) => {
            active = true;
            startY = e.clientY;
            const current = this.centerColumn.style.getPropertyValue("--timeline-height");
            const parsed = Number.parseFloat(current);
            startHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMELINE_PX;
            handle.setPointerCapture(e.pointerId);
        });
        handle.addEventListener("pointermove", (e) => {
            if (!active) {
                return;
            }
            const dy = startY - e.clientY;
            const maxPx = window.innerHeight * MAX_TIMELINE_PCT;
            const next = Math.max(MIN_TIMELINE_PX, Math.min(maxPx, startHeight + dy));
            this.centerColumn.style.setProperty("--timeline-height", `${next}px`);
        });
        const end = (e: PointerEvent): void => {
            if (!active) {
                return;
            }
            active = false;
            handle.releasePointerCapture(e.pointerId);
        };
        handle.addEventListener("pointerup", end);
        handle.addEventListener("pointercancel", end);
    }

    private async runCapture(req: CaptureRequest): Promise<void> {
        await this.overlays.showBusy("Capturing frame…");
        try {
            // Square the export: the larger of the two requested dimensions
            // wins both axes, so the mesh always sits in a centered square
            // canvas regardless of what numbers the user typed.
            const size = Math.max(req.width, req.height);
            const result = await this.baker.bakeFrame({
                format: req.format,
                width: size,
                height: size,
                transparent: true,
            });
            this.fileService.saveBlob(result.blob, `${this.exportStem()}.${result.suggestedExtension}`);
        } catch (err) {
            void modalService.alert(`Capture failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            this.overlays.hideBusy();
        }
    }

    private async runBake(req: BakeRequest): Promise<void> {
        if (!this.timeline.hasTimeline()) {
            void modalService.alert("Load a timeline JSON before baking an animation.");
            return;
        }
        await this.overlays.showBusy("Baking animation…");
        try {
            const size = Math.max(req.width, req.height);
            const result = await this.baker.bakeAnimation({
                format: req.format,
                width: size,
                height: size,
                fps: req.fps,
                durationMs: this.timeline.durationMs,
                transparent: true,
                gifWorkerScript: gifWorkerUrl,
            });
            this.fileService.saveBlob(result.blob, `${this.exportStem()}.${result.suggestedExtension}`);
        } catch (err) {
            void modalService.alert(`Bake failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            this.overlays.hideBusy();
        }
    }

    private runToggleTracking(): void {
        const next = !this.recorder.isEnabled();
        this.recorder.setEnabled(next);
        this.timelinePanel.setTrackingActive(next);
    }

    private buildStubTimeline(): Timeline {
        return {
            schemaVersion: TIMELINE_SCHEMA_VERSION,
            durationMs: 2000,
            loop: false,
            fps: 30,
            smoothing: true,
            initialSnapshot: this.snapshot.capture(),
            tracks: [],
        };
    }

    private exportStem(): string {
        return "voxlab";
    }

    /** Phase 1 baseline + Phase 2 stub. Phase 5/6 will also unmount
     *  components and release event listeners. */
    dispose(): void {
        this.viewport.stop();
    }
}

function imageDataToDataUrl(imageData: ImageData): string {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("voxlab pbr: failed to acquire 2d context for ImageData → dataUrl");
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}
