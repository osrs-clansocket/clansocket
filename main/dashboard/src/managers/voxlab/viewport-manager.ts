import {
    AxesHelper,
    Color,
    GridHelper,
    Group,
    LinearSRGBColorSpace,
    PCFSoftShadowMap,
    PerspectiveCamera,
    RGBAFormat,
    SRGBColorSpace,
    Scene,
    UnsignedByteType,
    Vector3,
    WebGLRenderer,
    WebGLRenderTarget,
    type Box3,
    type ColorSpace,
    type Mesh,
} from "three";

// three.js 0.184 dropped `DisplayP3ColorSpace` as an exported symbol — the
// color-space registry now requires runtime registration via
// `ColorManagement.define()` for wide-gamut. Using the canonical string token
// preserves the API; gamut accuracy requires the optional registration.
const DisplayP3ColorSpace = "display-p3" as ColorSpace;
import type { ColorSpaceMode } from "../../shared/constants/voxlab/effect-constants.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
    computeDefaultCameraView,
    computeFitCameraView,
    computeFrontCameraView,
} from "../../voxlab/formatters/camera-formatter.js";
import {
    AXES_LENGTH,
    CAMERA_FAR,
    CAMERA_FOV,
    CAMERA_NEAR,
    CLEAR_COLOR,
    GOLD_COLOR,
    GRID_DIVISIONS,
    GRID_FLOOR_Y,
    GRID_SIZE,
    ORBIT_DAMPING_FACTOR,
} from "../../shared/constants/voxlab/viewport-constants.js";
import type { CameraView } from "../../shared/types/voxlab/viewport-types.js";
import { ContextRecoveryService } from "./services/context-recovery-service.js";
import type { CursorService } from "./services/cursor-service.js";
import type { EffectsManager } from "./effects-manager.js";
import type { MotionManager } from "./motion-manager.js";
import type { StressShaderManager } from "./stress-shader-manager.js";

export class ViewportManager extends EventTarget {
    readonly scene = new Scene();
    readonly camera: PerspectiveCamera;
    readonly renderer: WebGLRenderer;
    readonly controls: OrbitControls;
    readonly stage: HTMLElement;
    private readonly helperGroup = new Group();
    private readonly canvas: HTMLCanvasElement;
    private readonly contextRecovery = new ContextRecoveryService();
    private resizeObserver: ResizeObserver | null = null;
    private rafHandle = 0;
    private running = false;
    private effects: EffectsManager | null = null;
    private motion: MotionManager | null = null;
    private stress: StressShaderManager | null = null;
    private animatedGroup: Group | null = null;
    private captureTarget: WebGLRenderTarget | null = null;
    private gridHelper!: GridHelper;
    private axesHelper!: AxesHelper;
    private readonly captureHideHooks: Array<() => () => void> = [];
    private gridSize = GRID_SIZE;
    private gridDivisions = GRID_DIVISIONS;
    private gridColor: number = GOLD_COLOR;
    private axesLength = AXES_LENGTH;
    private targetFps = 0; // 0 = unlimited; throttles tick() via timestamp gate
    private lastFrameMs = 0;
    // FPS measurement — counts ACTUAL rendered frames (skipped frames from
    // the targetFps throttle don't count). Emits fps-update every 500ms.
    private fpsFrameCount = 0;
    private fpsSampleStartMs = 0;
    private static readonly FPS_SAMPLE_WINDOW_MS = 500;

    constructor(
        stage: HTMLElement,
        canvas: HTMLCanvasElement,
        private readonly cursor: CursorService,
    ) {
        super();
        this.stage = stage;
        this.canvas = canvas;
        this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.scene.background = new Color(CLEAR_COLOR);

        this.camera = new PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = ORBIT_DAMPING_FACTOR;

        this.gridHelper = new GridHelper(GRID_SIZE, GRID_DIVISIONS, GOLD_COLOR, 0x444444);
        this.gridHelper.position.y = GRID_FLOOR_Y;
        this.helperGroup.add(this.gridHelper);
        this.axesHelper = new AxesHelper(AXES_LENGTH);
        this.helperGroup.add(this.axesHelper);
        this.scene.add(this.helperGroup);

        this.contextRecovery.addEventListener("rebuild-requested", () => {
            this.dispatchEvent(new CustomEvent("rebuild-requested"));
        });
    }

    useEffects(effects: EffectsManager): void {
        this.effects = effects;
    }

    useMotion(motion: MotionManager): void {
        this.motion = motion;
    }

    useStress(stress: StressShaderManager): void {
        this.stress = stress;
    }

    setAnimatedGroup(group: Group | null): void {
        this.animatedGroup = group;
    }

    start(): void {
        this.cursor.start(this.stage);
        this.contextRecovery.start(this.canvas);
        let resizeScheduled = false;
        this.resizeObserver = new ResizeObserver(() => {
            if (resizeScheduled) {
                return;
            }
            resizeScheduled = true;
            requestAnimationFrame(() => {
                resizeScheduled = false;
                this.resize();
            });
        });
        this.resizeObserver.observe(this.stage);
        this.resize();
        this.resetCamera(null);
        this.running = true;
        this.tick(performance.now());
    }

    stop(): void {
        this.running = false;
        if (this.rafHandle) {
            cancelAnimationFrame(this.rafHandle);
            this.rafHandle = 0;
        }
        this.cursor.stop();
        this.contextRecovery.stop();
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.effects?.dispose();
        if (this.captureTarget) {
            this.captureTarget.dispose();
            this.captureTarget = null;
        }
        this.renderer.dispose();
    }

    pauseTick(): void {
        this.running = false;
        if (this.rafHandle) {
            cancelAnimationFrame(this.rafHandle);
            this.rafHandle = 0;
        }
    }

    resumeTick(): void {
        if (this.running) {
            return;
        }
        this.running = true;
        this.tick(performance.now());
    }

    /**
     * Sub-systems that own scene-decoration objects (helpers, …)
     * register hooks here; each is called at the start of every capture and
     * must return a restore() callback that runs after.
     */
    addCaptureHideHook(register: () => () => void): void {
        this.captureHideHooks.push(register);
    }

    /** Supersample multiplier in effect for the live render (1 if no effects). */
    get supersample(): number {
        return this.effects?.getSupersample() ?? 1;
    }

    captureFramePixels(width: number, height: number, transparent: boolean, motionTimeMs?: number): Uint8Array {
        const pixels = new Uint8Array(width * height * 4);

        // Snapshot state we're about to mutate so we can restore it after.
        const savedBackground = this.scene.background;
        const savedAspect = this.camera.aspect;
        const savedClearAlpha = this.renderer.getClearAlpha();
        const savedHelpers = this.helperGroup.visible;

        // Aspect-correct the camera for the requested resolution — otherwise
        // the rendered scene gets squished because the camera still thinks
        // it's projecting into the viewport's aspect.
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Hide every registered decoration (grid + axes via direct toggle,
        // plus anything else that subscribes via captureHideHooks).
        this.helperGroup.visible = false;
        const restoreCallbacks: Array<() => void> = [];
        for (const register of this.captureHideHooks) {
            restoreCallbacks.push(register());
        }

        if (transparent) {
            this.scene.background = null;
            // Without this the composer's RenderPass clears with the
            // renderer's default alpha (which may be 1 if anything earlier
            // set a solid clearColor), giving an opaque background.
            this.renderer.setClearAlpha(0);
        }

        try {
            const t = motionTimeMs ?? performance.now();
            this.controls.update();
            if (this.animatedGroup && this.motion) {
                this.motion.apply(this.animatedGroup, t);
            }
            this.stress?.tick(t);
            let source: WebGLRenderTarget;
            if (this.effects) {
                source = this.effects.renderOffscreen(width, height);
            } else {
                if (!this.captureTarget) {
                    this.captureTarget = new WebGLRenderTarget(width, height, {
                        format: RGBAFormat,
                        type: UnsignedByteType,
                    });
                } else if (this.captureTarget.width !== width || this.captureTarget.height !== height) {
                    this.captureTarget.setSize(width, height);
                }
                source = this.captureTarget;
                this.renderer.setRenderTarget(source);
                this.renderer.clear();
                this.renderer.render(this.scene, this.camera);
                this.renderer.setRenderTarget(null);
            }
            this.renderer.readRenderTargetPixels(source, 0, 0, width, height, pixels);
        } finally {
            this.scene.background = savedBackground;
            this.camera.aspect = savedAspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setClearAlpha(savedClearAlpha);
            this.helperGroup.visible = savedHelpers;
            for (const restore of restoreCallbacks) {
                restore();
            }
        }
        return pixels;
    }

    setHelpersVisible(visible: boolean): void {
        this.helperGroup.visible = visible;
    }

    setGridColor(color: number | string): void {
        const c = new Color(color);
        this.gridColor = c.getHex();
        // GridHelper exposes two line colours; mutate both via the material so the
        // visual matches the picker without requiring a rebuild for colour-only changes.
        const grid = this.gridHelper;
        const mat = grid.material;
        if (Array.isArray(mat)) {
            for (const m of mat) {
                (m as { color?: Color }).color?.set(c);
            }
        } else {
            (mat as { color?: Color }).color?.set(c);
        }
    }

    setGridFloorY(y: number): void {
        this.gridHelper.position.y = y;
    }

    setGridSize(size: number): void {
        if (size === this.gridSize) {
            return;
        }
        this.gridSize = size;
        this.rebuildGridHelper();
    }

    setGridDivisions(divisions: number): void {
        const next = Math.max(2, Math.round(divisions));
        if (next === this.gridDivisions) {
            return;
        }
        this.gridDivisions = next;
        this.rebuildGridHelper();
    }

    setAxesLength(length: number): void {
        if (length === this.axesLength) {
            return;
        }
        this.axesLength = length;
        this.helperGroup.remove(this.axesHelper);
        this.axesHelper.geometry.dispose();
        const mat = this.axesHelper.material;
        if (Array.isArray(mat)) {
            for (const m of mat) {
                m.dispose();
            }
        } else {
            mat.dispose();
        }
        this.axesHelper = new AxesHelper(length);
        this.helperGroup.add(this.axesHelper);
    }

    private rebuildGridHelper(): void {
        const previousY = this.gridHelper.position.y;
        this.helperGroup.remove(this.gridHelper);
        this.gridHelper.geometry.dispose();
        const mat = this.gridHelper.material;
        if (Array.isArray(mat)) {
            for (const m of mat) {
                m.dispose();
            }
        } else {
            mat.dispose();
        }
        this.gridHelper = new GridHelper(this.gridSize, this.gridDivisions, this.gridColor, 0x444444);
        this.gridHelper.position.y = previousY;
        this.helperGroup.add(this.gridHelper);
    }

    setShadowsEnabled(enabled: boolean): void {
        this.renderer.shadowMap.enabled = enabled;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.renderer.shadowMap.needsUpdate = true;
    }

    /** Suspend per-frame shadow recompute (e.g. during paint mode where geometry
     *  doesn't move). Restores autoUpdate + triggers one-shot needsUpdate when
     *  re-enabled so the shadow stays correct after the suspension window. */
    setShadowAutoUpdate(enabled: boolean): void {
        this.renderer.shadowMap.autoUpdate = enabled;
        if (enabled) {
            this.renderer.shadowMap.needsUpdate = true;
        }
    }

    /** Override the canvas pixel ratio. Lower = faster + softer, higher = denser sampling. */
    setPixelRatio(ratio: number): void {
        if (!Number.isFinite(ratio) || ratio <= 0) {
            return;
        }
        this.renderer.setPixelRatio(ratio);
        // Trigger a resize since canvas drawing buffer dimensions changed.
        this.resize();
    }

    /** Throttle the rAF tick callback. 0 = unlimited (native rAF cadence). */
    setTargetFps(fps: number): void {
        if (!Number.isFinite(fps) || fps < 0) {
            this.targetFps = 0;
            return;
        }
        this.targetFps = fps;
    }

    /** Set the renderer's output color space. Three.js maps the framebuffer accordingly. */
    setColorSpace(mode: ColorSpaceMode): void {
        const space: ColorSpace =
            mode === "linear" ? LinearSRGBColorSpace : mode === "display-p3" ? DisplayP3ColorSpace : SRGBColorSpace;
        this.renderer.outputColorSpace = space;
    }

    setFov(fov: number): void {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    setNear(near: number): void {
        if (!Number.isFinite(near) || near <= 0) {
            return;
        }
        this.camera.near = near;
        this.camera.updateProjectionMatrix();
    }

    setFar(far: number): void {
        if (!Number.isFinite(far) || far <= this.camera.near) {
            return;
        }
        this.camera.far = far;
        this.camera.updateProjectionMatrix();
    }

    setDampingFactor(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            return;
        }
        this.controls.dampingFactor = factor;
    }

    setCameraPosition(x: number, y: number, z: number): void {
        this.camera.position.set(x, y, z);
        this.controls.update();
    }

    setCameraTarget(x: number, y: number, z: number): void {
        this.controls.target.set(x, y, z);
        this.controls.update();
    }

    panCameraScreenSpace(dx: number): void {
        const forward = new Vector3();
        this.camera.getWorldDirection(forward);
        const right = new Vector3().crossVectors(forward, this.camera.up).normalize();
        right.multiplyScalar(dx);
        this.camera.position.add(right);
        this.controls.target.add(right);
        this.controls.update();
        this.controls.saveState();
    }

    resetCamera(boundingBox: Box3 | null, fitMultiplier?: number): void {
        this.applyView(
            boundingBox
                ? computeFitCameraView(boundingBox, fitMultiplier, this.camera.aspect)
                : computeDefaultCameraView(),
        );
    }

    /** Push an exact authored camera state into the viewport, bypassing
     *  OrbitControls damping. The standard setCameraPosition + setCameraTarget
     *  path leaves damping enabled, which means controls.update applies
     *  smoothing each frame that can drift the camera off the intended
     *  position (visible as "camera reverts to default-ish" on initial
     *  render). This method disables damping for the duration of the apply,
     *  saves the resulting state as the controls' baseline, then restores
     *  damping for subsequent user orbit interactions. */
    applyCameraExact(cam: {
        fov: number;
        near: number;
        far: number;
        dampingFactor: number;
        positionX: number;
        positionY: number;
        positionZ: number;
        targetX: number;
        targetY: number;
        targetZ: number;
    }): void {
        const wasDamping = this.controls.enableDamping;
        this.controls.enableDamping = false;
        this.camera.fov = cam.fov;
        this.camera.near = cam.near;
        this.camera.far = cam.far;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(cam.positionX, cam.positionY, cam.positionZ);
        this.controls.target.set(cam.targetX, cam.targetY, cam.targetZ);
        this.controls.update();
        this.controls.saveState();
        this.controls.dampingFactor = cam.dampingFactor;
        this.controls.enableDamping = wasDamping;
    }

    frontView(mesh: Mesh, frontMultiplier?: number): void {
        if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox();
        }
        const box = mesh.geometry.boundingBox;
        if (box) {
            this.applyView(computeFrontCameraView(box, frontMultiplier));
        }
    }

    private applyView(view: CameraView): void {
        this.camera.position.set(...view.position);
        this.camera.lookAt(...view.target);
        this.controls.target.set(...view.target);
    }

    private resize = (): void => {
        const w = this.stage.clientWidth;
        const h = this.stage.clientHeight;
        if (w === 0 || h === 0) {
            return;
        }
        const newAspect = w / h;
        const aspectChanged = Math.abs(newAspect - this.camera.aspect) > 0.001;
        this.camera.aspect = newAspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
        this.effects?.resize(w, h);
        if (aspectChanged) {
            this.dispatchEvent(new CustomEvent("aspect-change"));
        }
    };

    private tick = (nowMs: number): void => {
        if (!this.running) {
            return;
        }
        // Target FPS throttle — skip render if not enough time elapsed since
        // last frame. 0 = unlimited (native rAF cadence, typically 60/120hz).
        if (this.targetFps > 0) {
            const minFrameMs = 1000 / this.targetFps;
            if (nowMs - this.lastFrameMs < minFrameMs) {
                this.rafHandle = requestAnimationFrame(this.tick);
                return;
            }
            this.lastFrameMs = nowMs;
        }
        try {
            this.controls.update();
            if (this.animatedGroup && this.motion) {
                this.motion.apply(this.animatedGroup, nowMs);
            }
            this.stress?.tick(nowMs);
            if (this.effects) {
                this.effects.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (err) {
            console.error("[voxlab] render tick error", err);
        }
        this.fpsFrameCount++;
        if (this.fpsSampleStartMs === 0) {
            this.fpsSampleStartMs = nowMs;
        }
        const sampleElapsed = nowMs - this.fpsSampleStartMs;
        if (sampleElapsed >= ViewportManager.FPS_SAMPLE_WINDOW_MS) {
            const fps = (this.fpsFrameCount / sampleElapsed) * 1000;
            this.dispatchEvent(new CustomEvent<number>("fps-update", { detail: fps }));
            this.fpsFrameCount = 0;
            this.fpsSampleStartMs = nowMs;
        }
        this.rafHandle = requestAnimationFrame(this.tick);
    };
}
