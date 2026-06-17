import { Color, Plane, Raycaster, Vector2, Vector3, type Camera, type MeshStandardMaterial } from "three";
import {
    STRESS_FRAGMENT_CHROMATIC,
    STRESS_FRAGMENT_PROLOGUE,
} from "../../shared/constants/voxlab/shaders/stress-fragment-constants.js";
import {
    STRESS_VERTEX_DISPLACEMENT,
    STRESS_VERTEX_PROLOGUE,
} from "../../shared/constants/voxlab/shaders/stress-vertex-constants.js";
import type { CursorService } from "./services/cursor-service.js";
import type { StressSettings } from "../../shared/types/voxlab/stress-types.js";

const DEFAULT_STRESS: StressSettings = {
    enabled: false,
    radius: 0.6,
    lerp: 0.14,
    glowColor: "#f5ca7a",
};

export class StressShaderManager {
    readonly defaults: StressSettings = { ...DEFAULT_STRESS };
    private readonly uniforms = {
        uMousePos: { value: new Vector3(99, 99, 99) },
        uStress: { value: 0 },
        uTime: { value: 0 },
        uStressRadius: { value: DEFAULT_STRESS.radius },
        uGoldColor: { value: new Color(DEFAULT_STRESS.glowColor) },
    };
    private settings: StressSettings = { ...DEFAULT_STRESS };
    private hovering = false;
    private camera: Camera | null = null;
    private anchorPoint: Vector3 | null = null;
    private readonly raycaster = new Raycaster();
    private readonly plane = new Plane(new Vector3(0, 0, 1), 0);
    private readonly ndcVec = new Vector2();
    private readonly hitPoint = new Vector3();
    private readonly removeListeners: (() => void)[] = [];
    private readonly tracked = new Set<MeshStandardMaterial>();

    constructor(private readonly cursor: CursorService) {}

    bind(camera: Camera): void {
        this.camera = camera;
        const onMove = (): void => this.updateMousePos();
        const onEnter = (): void => {
            this.hovering = true;
        };
        const onLeave = (): void => {
            this.hovering = false;
        };
        this.cursor.addEventListener("pointer-move", onMove);
        this.cursor.addEventListener("pointer-enter", onEnter);
        this.cursor.addEventListener("pointer-leave", onLeave);
        this.removeListeners.push(
            () => this.cursor.removeEventListener("pointer-move", onMove),
            () => this.cursor.removeEventListener("pointer-enter", onEnter),
            () => this.cursor.removeEventListener("pointer-leave", onLeave),
        );
    }

    unbind(): void {
        for (const fn of this.removeListeners) {
            fn();
        }
        this.removeListeners.length = 0;
        this.camera = null;
    }

    updateSettings(settings: StressSettings): void {
        this.settings = settings;
        this.uniforms.uStressRadius.value = settings.radius;
        this.uniforms.uGoldColor.value.set(settings.glowColor);
        if (!settings.enabled) {
            this.anchorPoint = null;
        }
        // No recompile on toggle — the shader is always injected (see
        // applyInjectionState) and `uStress` lerps between 0 and 1 in tick()
        // based on settings.enabled. recompile-on-toggle hit a Three.js
        // program-cache reuse path that left the cursor-binding stale after
        // disable→enable round-trips.
    }

    /**
     * Pin the effect at a world-space point (typically a raycast hit on the
     * mesh). The cursor-follow code goes dormant until the anchor is cleared.
     * Pass null to release.
     */
    setAnchor(point: Vector3 | null): void {
        if (point) {
            this.anchorPoint = point.clone();
            this.uniforms.uMousePos.value.copy(point);
        } else {
            this.anchorPoint = null;
        }
    }

    get anchored(): boolean {
        return this.anchorPoint !== null;
    }

    inject(material: MeshStandardMaterial): void {
        this.tracked.add(material);
        this.applyInjectionState(material);
    }

    // Always inject the stress shader code into every tracked material. The
    // visual gate is the `uStress` uniform — it lerps to 0 when disabled (no
    // displacement, no chromatic glow) and to 1 when enabled + hovering /
    // anchored. that way disable→enable is a pure uniform change with no
    // recompile, dodging the Three.js program-cache reuse path that left the
    // cursor binding stale after a round-trip.
    private applyInjectionState(material: MeshStandardMaterial): void {
        material.onBeforeCompile = (shader): void => {
            shader.uniforms.uMousePos = this.uniforms.uMousePos;
            shader.uniforms.uStress = this.uniforms.uStress;
            shader.uniforms.uTime = this.uniforms.uTime;
            shader.uniforms.uStressRadius = this.uniforms.uStressRadius;
            shader.uniforms.uGoldColor = this.uniforms.uGoldColor;

            shader.vertexShader = shader.vertexShader
                .replace("#include <common>", `#include <common>\n${STRESS_VERTEX_PROLOGUE}`)
                .replace("#include <begin_vertex>", `#include <begin_vertex>\n${STRESS_VERTEX_DISPLACEMENT}`);
            shader.fragmentShader = shader.fragmentShader
                .replace("#include <common>", `#include <common>\n${STRESS_FRAGMENT_PROLOGUE}`)
                .replace(
                    "#include <dithering_fragment>",
                    `#include <dithering_fragment>\n${STRESS_FRAGMENT_CHROMATIC}`,
                );
        };
        material.needsUpdate = true;
    }

    tick(nowMs: number): void {
        this.uniforms.uTime.value = nowMs / 1000;
        // Anchored ⇒ always full-strength; cursor-mode ⇒ ramp with hover.
        const target = this.settings.enabled && (this.anchorPoint !== null || this.hovering) ? 1 : 0;
        const cur = this.uniforms.uStress.value;
        this.uniforms.uStress.value = cur + (target - cur) * this.settings.lerp;
    }

    private updateMousePos(): void {
        if (!this.camera || this.anchorPoint) {
            // While anchored, cursor motion doesn't drag the effect around.
            return;
        }
        this.ndcVec.set(this.cursor.ndc.x, this.cursor.ndc.y);
        this.raycaster.setFromCamera(this.ndcVec, this.camera);
        const hit = this.raycaster.ray.intersectPlane(this.plane, this.hitPoint);
        if (hit) {
            this.uniforms.uMousePos.value.copy(this.hitPoint);
        }
    }
}
