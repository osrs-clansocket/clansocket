import "../../styles/pages/voxlab/voxlab-page.css";
import "../../styles/pages/voxlab/stage-page.css";
import "../../styles/pages/voxlab/picker-page.css";
import "../../styles/pages/voxlab/control-page.css";
import "../../styles/pages/voxlab/dropdown-page.css";
import "../../styles/pages/voxlab/footer-page.css";
import "../../styles/pages/voxlab/shell-page.css";
import "../../styles/pages/voxlab/modal-page.css";
import "../../styles/pages/voxlab/overlay-page.css";
import "../../styles/pages/voxlab/sidebar-page.css";
import "../../styles/pages/voxlab/tabs-page.css";
import "../../styles/pages/voxlab/presets-page.css";
import "../../styles/pages/voxlab/actions-page.css";
import "../../styles/pages/voxlab/timeline-page.css";
import { FooterPanelComponent } from "../../dom/forms/voxlab/panels/footer-panel-component.js";
import { LightingManager } from "./lighting-manager.js";
import { MeshManager } from "./mesh-manager.js";
import { SceneAugmentManager } from "./scene-augment-manager.js";
import { SnapshotManager } from "./snapshot-manager.js";
import { TimelineManager } from "./timeline-manager.js";
import { ViewportManager } from "./viewport-manager.js";
import { CursorService } from "./services/cursor-service.js";
import type { PublishPayload } from "./voxlab-editor.js";

/**
 * Headless renderer for replaying a PublishPayload onto a host element.
 *
 * Where the editor (VoxlabEditor / VoxlabAppManager) adds sidebar + footer +
 * overlays + recorder + history + presets on top of the rendering substrate,
 * VoxlabRenderer ships the substrate alone: ViewportManager + MeshManager +
 * LightingManager + SceneAugmentManager + SnapshotManager + TimelineManager
 * + a HEADLESS FooterPanelComponent that exists only so the section
 * instances register with the snapshotRegistry (which SnapshotManager.capture
 * + restore iterate against).
 *
 * Use case: clan-logo tiles in the ClanSocket dashboard list. Host provides a
 * sized DOM element; renderer fills it with a canvas + plays back the
 * published animation. Static fallback (`payload.thumbnailPng`) is the host's
 * responsibility when WebGL is unavailable.
 *
 * # Single-active constraint
 *
 * `snapshotRegistry` is a MODULE-LEVEL singleton — section instances register
 * by name. Constructing a second FooterPanelComponent (which any editor OR
 * renderer mount does) re-registers the same names, overwriting the prior
 * registration. Therefore: ONLY ONE VoxlabEditor or VoxlabRenderer can be
 * active per page at any moment. Per-tile use is via shared-renderer
 * round-robin (IntersectionObserver hands the renderer to the on-screen
 * tile), NOT N concurrent renderers. This matches the Phase 6 design
 * decision of "per-tile WebGL canvas reuse".
 */
export class VoxlabRenderer extends EventTarget {
    private viewport: ViewportManager | null = null;
    private meshes: MeshManager | null = null;
    private lighting: LightingManager | null = null;
    private augment: SceneAugmentManager | null = null;
    private snapshotMgr: SnapshotManager | null = null;
    private timeline: TimelineManager | null = null;
    private footer: FooterPanelComponent | null = null;
    private stage: HTMLDivElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private host: HTMLElement | null = null;

    /**
     * Mount the renderer into a host element. The host should have an
     * explicit size (the renderer fills its bounding box). If a `payload` is
     * provided, applies it immediately; otherwise the host can call
     * `setPayload` later — the renderer boots empty either way.
     *
     * Double-mounting without unmount throws.
     */
    mount(host: HTMLElement, payload?: PublishPayload): void {
        if (this.viewport) {
            throw new Error("VoxlabRenderer already mounted — call unmount() first");
        }
        this.host = host;

        this.stage = document.createElement("div");
        this.stage.className = "voxlab-renderer-stage";
        this.stage.style.cssText = "position: relative; width: 100%; height: 100%;";

        this.canvas = document.createElement("canvas");
        this.canvas.className = "voxlab-renderer-canvas";
        this.canvas.style.cssText = "display: block; width: 100%; height: 100%;";
        this.stage.appendChild(this.canvas);
        host.appendChild(this.stage);

        // Headless footer: FooterPanelComponent's constructor instantiates
        // every section, each of which registers with snapshotRegistry on
        // construction. We never call `.mount()` on the footer, so no UI
        // appears — but SceneAugmentManager wires its listeners to those
        // section EventTargets and any programmatic restore flowing through
        // snapshot.restore() reaches THREE.js exactly as it does in the
        // editor.
        //
        // buildAllSections() force-materialises each section's root element
        // so `this.inputs` is populated. Without it, the first applyState
        // call from snapshot.restore() crashes on `this.inputs.X.value =
        // ...` because build() hadn't run.
        this.footer = new FooterPanelComponent();
        this.footer.buildAllSections();

        const cursor = new CursorService();
        this.viewport = new ViewportManager(this.stage, this.canvas, cursor);
        // Display-context default: transparent. ViewportManager sets a solid
        // CLEAR_COLOR by default (for the editor's authoring viewport). The
        // renderer is for display only — the model floats over the dashboard
        // page. Published snapshots no longer bake the background part (per
        // voxlab-app-manager.publish), so this construction-time default is
        // the only thing setting scene.background for clean envelopes.
        // Legacy envelopes that still carry a baked background will override
        // this via snapshot.restore → background-change → effects.applySettings;
        // re-publish to refresh.
        this.viewport.scene.background = null;
        this.viewport.renderer.setClearAlpha(0);
        this.meshes = new MeshManager(this.viewport.scene);
        this.lighting = new LightingManager(this.viewport.scene, this.viewport.renderer);
        this.augment = new SceneAugmentManager(this.viewport, this.meshes, cursor, this.footer, this.lighting);
        // Per-instance registry from THIS renderer's footer keeps multi-
        // renderer pages (tweaker + N clan-avatars) animating independently.
        this.snapshotMgr = new SnapshotManager(this.footer.registry);
        this.timeline = new TimelineManager({ snapshot: this.snapshotMgr, registry: this.footer.registry });

        if (payload) {
            this.setPayload(payload);
        }
    }

    /**
     * Replace the rendered payload. Reapplies mesh + snapshot + timeline in
     * the same order as VoxlabAppManager.applyInitial so the visual outcome
     * is identical between editor and renderer.
     *
     * Safe to call repeatedly — e.g., a tile's payload changes when the
     * clan's logo is republished.
     */
    setPayload(payload: PublishPayload): void {
        if (!this.meshes || !this.snapshotMgr || !this.timeline || !this.viewport) {
            throw new Error("VoxlabRenderer.setPayload: not mounted");
        }
        // smoothShading is a GEOMETRY property (controls vertex normal merging
        // via `geometry-formatter:applySmoothShading`), set BEFORE loadMesh so
        // the geometry is built with the user's authored shading mode. The
        // editor handles this via voxlab-app-manager's shading-change handler
        // which calls setSmoothShading + meshes.rebuild — the renderer is
        // headless and has no equivalent listener, so apply once up-front from
        // the snapshot. Without this, the renderer's mesh is always flat-
        // shaded regardless of authoring, which produces washed-out metallic
        // surfaces (each flat facet reflects a different env angle, blowing
        // out to white at high metalness).
        const shadingPart = payload.snapshot?.parts?.shading as { smoothShading?: boolean } | undefined;
        if (shadingPart?.smoothShading !== undefined) {
            this.meshes.setSmoothShading(shadingPart.smoothShading);
        }
        this.meshes.loadMesh(payload.mesh, false);
        this.snapshotMgr.restore(payload.snapshot);
        this.timeline.load(payload.timeline);
        // timeline.load → seek(0) overrides the snapshot's camera with the
        // t=0 keyframe if camera tracks exist. Re-apply the snapshot's
        // camera so the static authored position wins for display.
        const snapshotCamera = payload.snapshot?.parts?.camera;
        if (snapshotCamera && this.footer) {
            const cameraSection = this.footer.camera;
            cameraSection.apply(snapshotCamera as Parameters<typeof cameraSection.apply>[0]);
        }
        // Override editor-mode state that the published snapshot carries but
        // display-mode never wants:
        //   - helpers (grid + axes): editor scaffolding only
        //   - background: display contexts want transparent so the model
        //     floats over the dashboard. New publishes strip the background
        //     at publish-time (voxlab-app-manager.publish), but legacy
        //     envelopes still have it baked — this override catches both.
        //   - timeline loop: display contexts run forever; no transport UI
        //     to manually restart a one-shot animation.
        this.viewport.setHelpersVisible(false);
        this.viewport.scene.background = null;
        this.viewport.renderer.setClearAlpha(0);
        this.timeline.setLoop(true);
    }

    private horizontalPan = 0;

    /** Begin the render loop AND auto-play the loaded timeline. Renderer
     *  contexts are display-only — no transport controls, just continuous
     *  loop playback of whatever was published. Idempotent. */
    start(): void {
        this.viewport?.start();
        // viewport.start() calls resetCamera(null) which clobbers the camera
        // applied by setPayload's snapshot.restore. applyCameraExact pushes
        // the section's current state with damping disabled so OrbitControls
        // can't drift the camera per-frame.
        if (this.footer && this.viewport) {
            this.applyHorizontalPan();
        }
        this.timeline?.play();
    }

    setHorizontalPan(panX: number): void {
        this.horizontalPan = panX;
        this.applyHorizontalPan();
    }

    private applyHorizontalPan(): void {
        if (!this.viewport || !this.footer) return;
        this.viewport.applyCameraExact(this.footer.camera.current);
        if (this.horizontalPan !== 0) {
            this.viewport.panCameraScreenSpace(this.horizontalPan);
        }
    }

    /** Pause the render loop (freezes the canvas on its last frame). Idempotent. */
    stop(): void {
        this.viewport?.stop();
    }

    /** Tear down DOM + drop manager references. Host can mount() again on a
     *  fresh host element afterward. */
    unmount(): void {
        this.viewport?.stop();
        if (this.stage && this.host && this.stage.parentElement === this.host) {
            this.host.removeChild(this.stage);
        }
        this.viewport = null;
        this.meshes = null;
        this.lighting = null;
        // augment is anchor-only (constructor wires listeners on footer + cursor
        // that GC-pin the instance) — touch it to satisfy ts noUnusedLocals.
        void this.augment;
        this.augment = null;
        this.snapshotMgr = null;
        this.timeline = null;
        this.footer = null;
        this.stage = null;
        this.canvas = null;
        this.host = null;
    }

    /** Whether the renderer currently holds a mounted host + active managers. */
    get isMounted(): boolean {
        return this.viewport !== null;
    }
}
