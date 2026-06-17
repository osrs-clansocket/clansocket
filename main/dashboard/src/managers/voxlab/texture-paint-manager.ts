import {
    type BufferAttribute,
    Color,
    DoubleSide,
    type Intersection,
    type Material,
    Mesh,
    MeshBasicMaterial,
    Raycaster,
    RingGeometry,
    Vector2,
    Vector3,
} from "three";
import type { FooterPanelComponent } from "../../dom/forms/voxlab/panels/footer-panel-component.js";
import {
    BRUSH_CURSOR_COLOR_HEX,
    BRUSH_CURSOR_INNER_RADIUS_RATIO,
    BRUSH_CURSOR_OPACITY,
    BRUSH_CURSOR_OUTER_RADIUS_RATIO,
    BRUSH_CURSOR_SEGMENTS,
    BRUSH_GRID_CELL_SIZE,
    DEFAULT_BRUSH_STATE,
    DEFAULT_PARTS_PAINT_STATE,
    MAX_STROKE_HISTORY,
    RGB_STRIDE,
} from "../../shared/constants/voxlab/texture-paint-constants.js";
import type {
    BrushChangeEventDetail,
    BrushState,
    GradientApplyEventDetail,
    GradientTarget,
    MeshPart,
    PaintOverride,
    PaintSnapshotState,
    PartsFillEventDetail,
    PartsPaintState,
    PartsResetEventDetail,
} from "../../shared/types/voxlab/paint-types.js";
import type { SnapshotRegistry } from "../../state/voxlab/registries/snapshot-registry.js";
import { brushMapper, VertexHashGrid } from "../../voxlab/mappers/brush-mapper.js";
import { eyedropMapper } from "../../voxlab/mappers/eyedrop-mapper.js";
import { gradientMapper } from "../../voxlab/mappers/gradient-mapper.js";
import type { MeshManager } from "./mesh-manager.js";
import type { ViewportManager } from "./viewport-manager.js";

const PART_ORDER: ReadonlyArray<MeshPart> = ["front", "back", "sides"];
const NDC_RANGE = 2;
const NDC_HALF = 1;
const MAX_SYMMETRY_POINTS = 8;

interface VertexRange {
    vertices: Set<number>;
    minV: number;
    maxV: number;
}

type RgbTuple = [number, number, number];

interface StrokeDelta {
    overrides: Map<number, [RgbTuple | null, RgbTuple | null]>;
    parts: Partial<Record<MeshPart, [string | null, string | null]>>;
}

export class TexturePaintManager extends EventTarget {
    private partsState: PartsPaintState = { ...DEFAULT_PARTS_PAINT_STATE };
    private overridesMap = new Map<number, RgbTuple>();
    private baselineColors: Float32Array | null = null;
    private brush: BrushState = { ...DEFAULT_BRUSH_STATE };
    private readonly brushColor = new Color();
    private readonly raycaster = new Raycaster();
    private readonly ndc = new Vector2();
    private readonly symmetryPoints: Vector3[] = Array.from({ length: MAX_SYMMETRY_POINTS }, () => new Vector3());
    private readonly cursorScratchNormal = new Vector3();
    private readonly cursorScratchTarget = new Vector3();
    private isPointerDown = false;
    private strokeBuffer = new Map<number, RgbTuple>();
    private brushCursorMesh: Mesh | null = null;
    private strokeHistory: StrokeDelta[] = [];
    private redoStack: StrokeDelta[] = [];
    private currentStrokeDelta: StrokeDelta | null = null;
    private vertexGrid: VertexHashGrid | null = null;
    private readonly partRangeCache = new Map<MeshPart, VertexRange | null>();
    private pendingPointerMove: PointerEvent | null = null;
    private moveRafScheduled = false;

    constructor(
        private readonly meshes: MeshManager,
        private readonly footer: FooterPanelComponent,
        registry: SnapshotRegistry,
        private readonly viewport: ViewportManager,
        private readonly canvas: HTMLCanvasElement,
    ) {
        super();
        this.meshes.addEventListener("mesh-loaded", () => {
            this.captureBaseline();
            this.applyAllPaint();
        });

        footer.parts.addEventListener("parts-fill", (e) => {
            const detail = (e as CustomEvent<PartsFillEventDetail>).detail;
            this.fillPart(detail.part, detail.color);
        });
        footer.parts.addEventListener("parts-reset", (e) => {
            const detail = (e as CustomEvent<PartsResetEventDetail>).detail;
            this.resetPart(detail.part);
        });
        footer.paint.addEventListener("brush-change", (e) => {
            this.applyBrushSettings((e as CustomEvent<BrushChangeEventDetail>).detail);
        });
        footer.paint.addEventListener("paint-clear-all", () => {
            this.clearAllPaint();
        });
        footer.gradient.addEventListener("gradient-apply", (e) => {
            this.applyGradient((e as CustomEvent<GradientApplyEventDetail>).detail);
        });
        footer.addEventListener("reset-all", () => {
            this.clearAllPaint();
        });

        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
        this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
        this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
        this.canvas.addEventListener("pointercancel", (e) => this.onPointerUp(e));
        document.addEventListener("keydown", (e) => this.onKeyDown(e));

        registry.register<PaintSnapshotState>({
            name: "paint",
            getState: () => this.snapshotState(),
            applyState: (state) => {
                this.partsState = { ...state.parts };
                this.overridesMap = mapFromOverrides(state.overrides);
                this.applyAllPaint();
            },
            paths: [],
        });
    }

    clearAllPaint(): void {
        const delta: StrokeDelta = { overrides: new Map(), parts: {} };
        for (const part of PART_ORDER) {
            if (this.partsState[part] !== null) {
                delta.parts[part] = [this.partsState[part], null];
            }
        }
        for (const [v, rgb] of this.overridesMap) {
            delta.overrides.set(v, [[rgb[0], rgb[1], rgb[2]], null]);
        }
        this.pushDelta(delta);
        this.partsState = { ...DEFAULT_PARTS_PAINT_STATE };
        this.overridesMap.clear();
        this.applyAllPaint();
        this.emitStateChange();
    }

    undoStroke(): void {
        const delta = this.strokeHistory.pop();
        if (delta === undefined) {
            return;
        }
        for (const [v, [before, _]] of delta.overrides) {
            if (before === null) {
                this.overridesMap.delete(v);
            } else {
                this.overridesMap.set(v, [before[0], before[1], before[2]]);
            }
        }
        for (const part of PART_ORDER) {
            const entry = delta.parts[part];
            if (entry !== undefined) {
                this.partsState[part] = entry[0];
            }
        }
        this.redoStack.push(delta);
        this.applyPartial(this.collectAffectedVertices(delta));
        this.emitStateChange();
    }

    redoStroke(): void {
        const delta = this.redoStack.pop();
        if (delta === undefined) {
            return;
        }
        for (const [v, [_, after]] of delta.overrides) {
            if (after === null) {
                this.overridesMap.delete(v);
            } else {
                this.overridesMap.set(v, [after[0], after[1], after[2]]);
            }
        }
        for (const part of PART_ORDER) {
            const entry = delta.parts[part];
            if (entry !== undefined) {
                this.partsState[part] = entry[1];
            }
        }
        this.strokeHistory.push(delta);
        this.applyPartial(this.collectAffectedVertices(delta));
        this.emitStateChange();
    }

    private collectAffectedVertices(delta: StrokeDelta): Set<number> {
        const changed = new Set<number>();
        for (const v of delta.overrides.keys()) {
            changed.add(v);
        }
        for (const part of PART_ORDER) {
            if (delta.parts[part] !== undefined) {
                const range = this.getPartIndexRange(part);
                if (range) {
                    for (const v of range.vertices) {
                        changed.add(v);
                    }
                }
            }
        }
        return changed;
    }

    private snapshotState(): PaintSnapshotState {
        const overrides: PaintOverride[] = [];
        for (const [vertexIndex, rgb] of this.overridesMap) {
            overrides.push({ vertexIndex, rgb: [rgb[0], rgb[1], rgb[2]] });
        }
        return {
            parts: { ...this.partsState },
            overrides,
        };
    }

    private pushDelta(delta: StrokeDelta): void {
        this.strokeHistory.push(delta);
        if (this.strokeHistory.length > MAX_STROKE_HISTORY) {
            this.strokeHistory.shift();
        }
        this.redoStack = [];
    }

    private applyGradient(spec: GradientApplyEventDetail): void {
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return;
        }
        const positions = mesh.geometry.getAttribute("position") as BufferAttribute | undefined;
        if (!positions) {
            return;
        }
        const targetVertices = this.getTargetVertices(spec.target, positions.count);
        if (targetVertices.size === 0) {
            return;
        }
        const overrides = gradientMapper(positions, targetVertices, spec);
        const delta: StrokeDelta = { overrides: new Map(), parts: {} };
        for (const o of overrides) {
            const before = this.overridesMap.get(o.vertexIndex);
            const newRgb: RgbTuple = [o.rgb[0], o.rgb[1], o.rgb[2]];
            delta.overrides.set(o.vertexIndex, [before ? [before[0], before[1], before[2]] : null, newRgb]);
            this.overridesMap.set(o.vertexIndex, newRgb);
        }
        this.pushDelta(delta);
        if (spec.target === "all") {
            this.applyAllPaint();
        } else {
            this.applyPartial(targetVertices);
        }
        this.emitStateChange();
    }

    private getTargetVertices(target: GradientTarget, totalCount: number): Set<number> {
        if (target === "all") {
            const all = new Set<number>();
            for (let i = 0; i < totalCount; i++) {
                all.add(i);
            }
            return all;
        }
        const range = this.getPartIndexRange(target);
        return range?.vertices ?? new Set();
    }

    private applyBrushSettings(settings: BrushChangeEventDetail): void {
        this.brush = { ...settings };
        this.brushColor.set(this.brush.color);
        this.viewport.controls.enabled = !this.brush.paintMode;
        this.viewport.setShadowAutoUpdate(!this.brush.paintMode);
        this.syncBrushCursor();
    }

    private syncBrushCursor(): void {
        if (this.brush.paintMode) {
            if (!this.brushCursorMesh) {
                const geom = new RingGeometry(
                    BRUSH_CURSOR_INNER_RADIUS_RATIO,
                    BRUSH_CURSOR_OUTER_RADIUS_RATIO,
                    BRUSH_CURSOR_SEGMENTS,
                );
                const mat = new MeshBasicMaterial({
                    color: BRUSH_CURSOR_COLOR_HEX,
                    transparent: true,
                    opacity: BRUSH_CURSOR_OPACITY,
                    side: DoubleSide,
                    depthTest: false,
                });
                this.brushCursorMesh = new Mesh(geom, mat);
                this.brushCursorMesh.visible = false;
                this.brushCursorMesh.renderOrder = 999;
                this.viewport.scene.add(this.brushCursorMesh);
            }
            this.brushCursorMesh.scale.setScalar(this.brush.radius);
        } else if (this.brushCursorMesh) {
            this.viewport.scene.remove(this.brushCursorMesh);
            this.brushCursorMesh.geometry.dispose();
            (this.brushCursorMesh.material as Material).dispose();
            this.brushCursorMesh = null;
        }
    }

    private raycastFromEvent(e: PointerEvent): Intersection | null {
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return null;
        }
        const rect = this.canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * NDC_RANGE - NDC_HALF;
        const ndcY = -((e.clientY - rect.top) / rect.height) * NDC_RANGE + NDC_HALF;
        this.ndc.set(ndcX, ndcY);
        this.raycaster.setFromCamera(this.ndc, this.viewport.camera);
        const hits = this.raycaster.intersectObject(mesh, false);
        return hits.length > 0 ? hits[0] : null;
    }

    private positionCursorAtHit(hit: Intersection): void {
        if (!this.brushCursorMesh) {
            return;
        }
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return;
        }
        this.brushCursorMesh.visible = true;
        this.brushCursorMesh.position.copy(hit.point);
        if (hit.face) {
            this.cursorScratchNormal.copy(hit.face.normal).transformDirection(mesh.matrixWorld);
            this.cursorScratchTarget.copy(hit.point).add(this.cursorScratchNormal);
            this.brushCursorMesh.lookAt(this.cursorScratchTarget);
        }
    }

    private onPointerDown(e: PointerEvent): void {
        if (!this.brush.paintMode) {
            return;
        }
        if (this.brush.eyedropper) {
            this.performEyedrop(e);
            return;
        }
        this.isPointerDown = true;
        this.strokeBuffer = new Map();
        this.currentStrokeDelta = { overrides: new Map(), parts: {} };
        this.canvas.setPointerCapture(e.pointerId);
        const hit = this.raycastFromEvent(e);
        if (hit !== null) {
            this.positionCursorAtHit(hit);
            this.applyBrushAtPoint(hit.point);
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (!this.brush.paintMode) {
            return;
        }
        const isCtrlZ = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
        const isCtrlShiftZ = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey;
        const isCtrlY = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y";
        if (isCtrlZ) {
            e.preventDefault();
            this.undoStroke();
        } else if (isCtrlShiftZ || isCtrlY) {
            e.preventDefault();
            this.redoStroke();
        }
    }

    private performEyedrop(e: PointerEvent): void {
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return;
        }
        const positions = mesh.geometry.getAttribute("position") as BufferAttribute | undefined;
        const colorAttr = this.requireColorAttribute();
        if (!positions || !colorAttr) {
            return;
        }
        const hit = this.raycastFromEvent(e);
        if (hit === null) {
            return;
        }
        const pickedColor = eyedropMapper(hit, positions, colorAttr);
        if (pickedColor === null) {
            return;
        }
        this.footer.paint.apply({ ...this.brush, color: pickedColor, eyedropper: false });
    }

    private onPointerMove(e: PointerEvent): void {
        if (!this.brush.paintMode) {
            return;
        }
        this.pendingPointerMove = e;
        if (!this.moveRafScheduled) {
            this.moveRafScheduled = true;
            requestAnimationFrame(() => this.flushPointerMove());
        }
    }

    private flushPointerMove(): void {
        this.moveRafScheduled = false;
        const e = this.pendingPointerMove;
        if (!e) {
            return;
        }
        this.pendingPointerMove = null;
        const hit = this.raycastFromEvent(e);
        if (hit === null) {
            if (this.brushCursorMesh) {
                this.brushCursorMesh.visible = false;
            }
            return;
        }
        this.positionCursorAtHit(hit);
        if (this.isPointerDown) {
            this.applyBrushAtPoint(hit.point);
        }
    }

    private onPointerUp(e: PointerEvent): void {
        if (!this.isPointerDown) {
            return;
        }
        this.isPointerDown = false;
        this.commitStroke();
        try {
            this.canvas.releasePointerCapture(e.pointerId);
        } catch {
            // pointer may not have been captured; no-op
        }
    }

    private commitStroke(): void {
        if (this.strokeBuffer.size === 0) {
            this.currentStrokeDelta = null;
            return;
        }
        const delta = this.currentStrokeDelta;
        for (const [v, rgb] of this.strokeBuffer) {
            // Transfer ownership of rgb tuple directly — no clone. strokeBuffer
            // gets cleared after this loop; overridesMap + delta.overrides take
            // over the references. Next stroke creates a fresh strokeBuffer
            // (in onPointerDown) so no shared mutation risk.
            this.overridesMap.set(v, rgb);
            if (delta) {
                const entry = delta.overrides.get(v);
                if (entry) {
                    entry[1] = rgb;
                }
            }
        }
        this.strokeBuffer.clear();
        if (delta && delta.overrides.size > 0) {
            this.pushDelta(delta);
        }
        this.currentStrokeDelta = null;
        this.emitStateChange();
    }

    private emitStateChange(): void {
        this.dispatchEvent(new CustomEvent("paint-state-change"));
    }

    private applyBrushAtPoint(worldPoint: Vector3): void {
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return;
        }
        const positions = mesh.geometry.getAttribute("position") as BufferAttribute | undefined;
        if (!positions) {
            return;
        }
        const colorAttr = this.requireColorAttribute();
        if (!colorAttr) {
            return;
        }
        const normals = this.brush.hideBackFaces
            ? (mesh.geometry.getAttribute("normal") as BufferAttribute | undefined)
            : undefined;
        const cameraPos = this.brush.hideBackFaces ? this.viewport.camera.position : undefined;

        const arr = colorAttr.array as Float32Array;
        const pointCount = this.gatherSymmetryPoints(worldPoint);
        let globalMinV = Infinity;
        let globalMaxV = -Infinity;
        for (let i = 0; i < pointCount; i++) {
            const p = this.symmetryPoints[i];
            const candidates = this.vertexGrid !== null ? this.vertexGrid.queryRadius(p, this.brush.radius) : null;
            const hits = brushMapper(p, positions, this.brush.radius, this.brush.falloffSigma, candidates, {
                normals,
                cameraPos,
                hideBackFaces: this.brush.hideBackFaces,
            });
            if (hits.length === 0) {
                continue;
            }
            const range = this.blendHits(hits, arr);
            if (range.minV < globalMinV) {
                globalMinV = range.minV;
            }
            if (range.maxV > globalMaxV) {
                globalMaxV = range.maxV;
            }
        }

        if (globalMinV !== Infinity) {
            colorAttr.updateRanges = [
                { start: globalMinV * RGB_STRIDE, count: (globalMaxV - globalMinV + 1) * RGB_STRIDE },
            ];
        }
        colorAttr.needsUpdate = true;
    }

    private gatherSymmetryPoints(worldPoint: Vector3): number {
        this.symmetryPoints[0].copy(worldPoint);
        let count = 1;
        if (this.brush.mirrorX) {
            const existing = count;
            for (let i = 0; i < existing; i++) {
                const src = this.symmetryPoints[i];
                this.symmetryPoints[count].set(-src.x, src.y, src.z);
                count++;
            }
        }
        if (this.brush.mirrorY) {
            const existing = count;
            for (let i = 0; i < existing; i++) {
                const src = this.symmetryPoints[i];
                this.symmetryPoints[count].set(src.x, -src.y, src.z);
                count++;
            }
        }
        if (this.brush.mirrorZ) {
            const existing = count;
            for (let i = 0; i < existing; i++) {
                const src = this.symmetryPoints[i];
                this.symmetryPoints[count].set(src.x, src.y, -src.z);
                count++;
            }
        }
        return count;
    }

    private blendHits(
        hits: ReadonlyArray<{ vertexIndex: number; weight: number }>,
        arr: Float32Array,
    ): { minV: number; maxV: number } {
        const targetR = this.brushColor.r;
        const targetG = this.brushColor.g;
        const targetB = this.brushColor.b;
        const isErase = this.brush.mode === "erase";
        const baseline = this.baselineColors;
        const delta = this.currentStrokeDelta;
        let minV = Infinity;
        let maxV = -Infinity;
        for (const hit of hits) {
            const blendWeight = hit.weight * this.brush.opacity;
            const v = hit.vertexIndex;
            const base = v * RGB_STRIDE;
            const currentR = arr[base];
            const currentG = arr[base + 1];
            const currentB = arr[base + 2];
            let newR: number;
            let newG: number;
            let newB: number;
            if (isErase && baseline) {
                newR = currentR + (baseline[base] - currentR) * blendWeight;
                newG = currentG + (baseline[base + 1] - currentG) * blendWeight;
                newB = currentB + (baseline[base + 2] - currentB) * blendWeight;
            } else {
                newR = currentR + (targetR - currentR) * blendWeight;
                newG = currentG + (targetG - currentG) * blendWeight;
                newB = currentB + (targetB - currentB) * blendWeight;
            }
            arr[base] = newR;
            arr[base + 1] = newG;
            arr[base + 2] = newB;
            this.strokeBuffer.set(v, [newR, newG, newB]);
            if (delta && !delta.overrides.has(v)) {
                const before = this.overridesMap.get(v);
                delta.overrides.set(v, [before ? [before[0], before[1], before[2]] : null, null]);
            }
            if (v < minV) {
                minV = v;
            }
            if (v > maxV) {
                maxV = v;
            }
        }
        return { minV, maxV };
    }

    private captureBaseline(): void {
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return;
        }
        const colorAttr = mesh.geometry.getAttribute("color") as BufferAttribute | undefined;
        if (!colorAttr) {
            return;
        }
        this.baselineColors = new Float32Array(colorAttr.array);
        const positions = mesh.geometry.getAttribute("position") as BufferAttribute | undefined;
        if (positions) {
            this.vertexGrid = new VertexHashGrid(positions, BRUSH_GRID_CELL_SIZE);
        } else {
            this.vertexGrid = null;
        }
        this.partRangeCache.clear();
        for (const part of PART_ORDER) {
            this.partRangeCache.set(part, this.computePartIndexRange(part));
        }
    }

    private fillPart(part: MeshPart, color: string): void {
        const delta: StrokeDelta = { overrides: new Map(), parts: {} };
        delta.parts[part] = [this.partsState[part], color];
        this.pushDelta(delta);
        this.partsState[part] = color;
        const range = this.getPartIndexRange(part);
        if (range) {
            this.applyPartial(range.vertices);
        } else {
            this.applyAllPaint();
        }
        this.emitStateChange();
    }

    private resetPart(part: MeshPart): void {
        const delta: StrokeDelta = { overrides: new Map(), parts: {} };
        delta.parts[part] = [this.partsState[part], null];
        const range = this.getPartIndexRange(part);
        if (range) {
            for (const v of range.vertices) {
                const existing = this.overridesMap.get(v);
                if (existing) {
                    delta.overrides.set(v, [[existing[0], existing[1], existing[2]], null]);
                }
            }
        }
        this.pushDelta(delta);
        this.partsState[part] = null;
        if (range) {
            for (const v of range.vertices) {
                this.overridesMap.delete(v);
            }
            this.applyPartial(range.vertices);
        } else {
            this.applyAllPaint();
        }
        this.emitStateChange();
    }

    private applyAllPaint(): void {
        if (!this.baselineColors) {
            return;
        }
        const colorAttr = this.requireColorAttribute();
        if (!colorAttr) {
            return;
        }
        const dest = colorAttr.array as Float32Array;
        dest.set(this.baselineColors);

        for (const part of PART_ORDER) {
            const color = this.partsState[part];
            if (color !== null) {
                this.applyPartFillIntoBuffer(part, color, dest);
            }
        }

        for (const [vertexIndex, rgb] of this.overridesMap) {
            const base = vertexIndex * RGB_STRIDE;
            dest[base] = rgb[0];
            dest[base + 1] = rgb[1];
            dest[base + 2] = rgb[2];
        }

        colorAttr.needsUpdate = true;
    }

    private applyPartial(changedVertices: Iterable<number>): void {
        if (!this.baselineColors) {
            return;
        }
        const colorAttr = this.requireColorAttribute();
        if (!colorAttr) {
            return;
        }
        const arr = colorAttr.array as Float32Array;
        const baseline = this.baselineColors;

        // Pre-resolve part fills (avoid Color allocation per vertex)
        const partColors: Array<RgbTuple | null> = [null, null, null];
        const partRanges: Array<VertexRange | null> = [null, null, null];
        for (let i = 0; i < PART_ORDER.length; i++) {
            const color = this.partsState[PART_ORDER[i]];
            if (color !== null) {
                const c = new Color(color);
                partColors[i] = [c.r, c.g, c.b];
                partRanges[i] = this.getPartIndexRange(PART_ORDER[i]);
            }
        }

        let minV = Infinity;
        let maxV = -Infinity;
        for (const v of changedVertices) {
            const base = v * RGB_STRIDE;
            let r = baseline[base];
            let g = baseline[base + 1];
            let b = baseline[base + 2];

            // Part fill overrides baseline
            for (let i = 0; i < PART_ORDER.length; i++) {
                const partColor = partColors[i];
                const partRange = partRanges[i];
                if (partColor !== null && partRange !== null && partRange.vertices.has(v)) {
                    r = partColor[0];
                    g = partColor[1];
                    b = partColor[2];
                    break;
                }
            }

            // Per-vertex override beats parts
            const override = this.overridesMap.get(v);
            if (override !== undefined) {
                r = override[0];
                g = override[1];
                b = override[2];
            }

            arr[base] = r;
            arr[base + 1] = g;
            arr[base + 2] = b;

            if (v < minV) {
                minV = v;
            }
            if (v > maxV) {
                maxV = v;
            }
        }

        if (minV !== Infinity) {
            colorAttr.updateRanges = [{ start: minV * RGB_STRIDE, count: (maxV - minV + 1) * RGB_STRIDE }];
        }
        colorAttr.needsUpdate = true;
    }

    private applyPartFillIntoBuffer(part: MeshPart, color: string, dest: Float32Array): void {
        const range = this.getPartIndexRange(part);
        if (!range) {
            return;
        }
        const c = new Color(color);
        for (const v of range.vertices) {
            const base = v * RGB_STRIDE;
            dest[base] = c.r;
            dest[base + 1] = c.g;
            dest[base + 2] = c.b;
        }
    }

    private getPartIndexRange(part: MeshPart): VertexRange | null {
        return this.partRangeCache.get(part) ?? null;
    }

    private computePartIndexRange(part: MeshPart): VertexRange | null {
        const meshData = this.meshes.meshData;
        if (!meshData) {
            return null;
        }
        const boundaries = meshData.metadata.groupBoundaries;
        if (!boundaries) {
            return null;
        }
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return null;
        }
        const indices = mesh.geometry.getIndex();
        if (!indices) {
            return null;
        }

        let startIdx: number;
        let endIdx: number;
        if (part === "front") {
            startIdx = 0;
            endIdx = boundaries.frontIndexEnd;
        } else if (part === "back") {
            startIdx = boundaries.frontIndexEnd;
            endIdx = boundaries.backIndexEnd;
        } else {
            startIdx = boundaries.backIndexEnd;
            endIdx = boundaries.sideIndexEnd;
        }

        const vertices = new Set<number>();
        let minV = Infinity;
        let maxV = -Infinity;
        for (let i = startIdx; i < endIdx; i++) {
            const v = indices.getX(i);
            vertices.add(v);
            if (v < minV) {
                minV = v;
            }
            if (v > maxV) {
                maxV = v;
            }
        }

        if (minV === Infinity) {
            return null;
        }
        return { vertices, minV, maxV };
    }

    private requireColorAttribute(): BufferAttribute | null {
        const mesh = this.meshes.mesh;
        if (!mesh) {
            return null;
        }
        const attr = mesh.geometry.getAttribute("color") as BufferAttribute | undefined;
        return attr ?? null;
    }
}

function mapFromOverrides(overrides: ReadonlyArray<PaintOverride>): Map<number, RgbTuple> {
    const out = new Map<number, RgbTuple>();
    for (const o of overrides) {
        out.set(o.vertexIndex, [o.rgb[0], o.rgb[1], o.rgb[2]]);
    }
    return out;
}
