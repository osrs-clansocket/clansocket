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
import { VoxlabAppManager } from "./voxlab-app-manager.js";
import type { MeshData } from "../../shared/types/voxlab/mesh-types.js";
import type { SceneSnapshot } from "../../shared/types/voxlab/snapshot-types.js";
import type { Timeline } from "../../shared/types/voxlab/timeline-types.js";

/**
 * Payload emitted on publish. Single envelope containing everything ClanSocket
 * needs to (a) re-render the clan logo via WebGL in any tile and (b) fall back
 * to a static thumbnail in WebGL-unavailable contexts.
 *
 * `payloadVersion` is the OUTER envelope version. Inner `snapshot` and
 * `timeline` carry their own `schemaVersion` numbers — they migrate
 * independently through `snapshot-parser` / timeline migrations.
 */
export interface PublishPayload {
    payloadVersion: 1;
    mesh: MeshData;
    snapshot: SceneSnapshot;
    timeline: Timeline;
    thumbnailPng: Blob;
}

/**
 * Initial state the host passes when opening the editor. All three are
 * optional individually — host may pass any combination.
 */
export interface VoxlabEditorInitialState {
    mesh?: MeshData;
    snapshot?: SceneSnapshot;
    timeline?: Timeline;
}

export interface VoxlabEditorOptions {
    initial?: VoxlabEditorInitialState;
}

/**
 * Library-shape entry point for embedding voxlab as a clan-logo editor.
 * Host calls `.mount(root, options)` to instantiate, `.on("publish", ...)`
 * to receive the published payload, `.unmount()` to dispose.
 *
 * Publish flow:
 *   user clicks "Publish" in the editor sidebar → app builds the envelope
 *   (mesh + snapshot + timeline + 512×512 transparent thumbnail PNG via the
 *   bake pipeline) → onPublish callback dispatches the `"publish"` event.
 *
 * Programmatic alternative: host calls `.publish()` directly. Same envelope,
 * same event dispatch — but the host gets the payload as a return value too
 * for synchronous use.
 */
export class VoxlabEditor extends EventTarget {
    private app: VoxlabAppManager | null = null;
    private root: HTMLElement | null = null;

    /** Mount the editor into a host-provided root element. Double-calling
     *  without unmount throws — host owns the lifecycle. */
    mount(root: HTMLElement, options?: VoxlabEditorOptions): void {
        if (this.app) {
            throw new Error("VoxlabEditor already mounted — call unmount() first");
        }
        this.root = root;
        this.app = new VoxlabAppManager(root, {
            onPublish: (payload) => this.emitPublish(payload),
            onReloadRequested: () => this.emitReload(),
        });
        // applyInitial BEFORE start so persisted-restore-on-start sees the
        // host-managed flag and skips loading stale localStorage state.
        if (options?.initial) {
            this.app.applyInitial(options.initial);
        }
        this.app.start();
    }

    unmount(): void {
        if (!this.app) {
            return;
        }
        this.app.dispose();
        if (this.root) {
            this.root.replaceChildren();
        }
        this.app = null;
        this.root = null;
    }

    /** Replace the loaded mesh post-mount. Used by the page composer when the
     *  user clicks "Reload mesh" — re-runs raster-to-mesh on the source image
     *  and feeds the fresh MeshData here. Throws if not mounted. */
    applyMesh(mesh: MeshData): void {
        if (!this.app) {
            throw new Error("VoxlabEditor.applyMesh: not mounted");
        }
        this.app.applyInitial({ mesh });
    }

    /** Programmatic publish — builds the envelope, dispatches the `publish`
     *  event, AND returns the payload for direct host consumption. Throws if
     *  no mesh is loaded. */
    async publish(): Promise<PublishPayload> {
        if (!this.app) {
            throw new Error("VoxlabEditor.publish: not mounted");
        }
        const payload = await this.app.publish();
        this.emitPublish(payload);
        return payload;
    }

    /** Typed wrapper over `addEventListener` for editor-level events. */
    on(event: "publish", listener: (payload: PublishPayload) => void): void;
    on(event: "reload", listener: () => void): void;
    on(event: "publish" | "reload", listener: ((payload: PublishPayload) => void) | (() => void)): void {
        if (event === "publish") {
            this.addEventListener(event, (e) => {
                (listener as (payload: PublishPayload) => void)((e as CustomEvent<PublishPayload>).detail);
            });
            return;
        }
        this.addEventListener(event, () => (listener as () => void)());
    }

    /** Internal — called by VoxlabAppManager when the in-editor Publish
     *  button is clicked. Kept on the editor surface so the dispatch site is
     *  symmetric with the `on("publish")` subscription. */
    emitPublish(payload: PublishPayload): void {
        this.dispatchEvent(new CustomEvent<PublishPayload>("publish", { detail: payload }));
    }

    /** Internal — called by VoxlabAppManager when the mesh-section "Reload
     *  from source" button is clicked. The page composer is the natural
     *  owner of the source image, so we just signal up; the host re-runs
     *  raster-to-mesh and calls `applyMesh()`. */
    emitReload(): void {
        this.dispatchEvent(new CustomEvent("reload"));
    }
}

export type { MeshData, SceneSnapshot, Timeline };
export { VoxlabRenderer } from "./voxlab-renderer.js";
