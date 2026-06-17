import type { EdgeSegment, Point2D, Polygon } from "./types.js";

const EPSILON = 1e-6;
const QUANTIZE_PRECISION = 1e4;
const Y_SHIFT = 1 << 24;

export function chainSegments(segments: EdgeSegment[]): Point2D[][] {
    const adjacency = buildAdjacency(segments);
    const visited = new Set<number>();
    const rings: Point2D[][] = [];
    const state: ChainState = { segments, adjacency, visited };
    for (let i = 0; i < segments.length; i++) {
        if (visited.has(i)) {
            continue;
        }
        const ring = followRing(state, i);
        if (ring.length >= 3) {
            rings.push(ring);
        }
    }
    return rings;
}

interface ChainState {
    segments: EdgeSegment[];
    adjacency: Map<number, number[]>;
    visited: Set<number>;
}

function buildAdjacency(segments: EdgeSegment[]): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (let i = 0; i < segments.length; i++) {
        const key = quantize(segments[i].x1, segments[i].y1);
        const list = map.get(key) ?? [];
        list.push(i);
        map.set(key, list);
    }
    return map;
}

function followRing(state: ChainState, startIdx: number): Point2D[] {
    const { segments, visited } = state;
    const ring: Point2D[] = [{ x: segments[startIdx].x1, y: segments[startIdx].y1 }];
    let currentIdx = startIdx;
    const ringLimit = segments.length + 1;
    for (let step = 0; step < ringLimit; step++) {
        if (visited.has(currentIdx)) {
            break;
        }
        visited.add(currentIdx);
        const seg = segments[currentIdx];
        ring.push({ x: seg.x2, y: seg.y2 });
        const nextIdx = findNext(state, seg.x2, seg.y2);
        if (nextIdx === -1) {
            break;
        }
        currentIdx = nextIdx;
    }
    closeRingIfNeeded(ring);
    return ring;
}

function closeRingIfNeeded(ring: Point2D[]): void {
    if (ring.length < 2) {
        return;
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (Math.abs(first.x - last.x) < EPSILON && Math.abs(first.y - last.y) < EPSILON) {
        ring.pop();
    }
}

function findNext(state: ChainState, x: number, y: number): number {
    const candidates = state.adjacency.get(quantize(x, y));
    if (!candidates) {
        return -1;
    }
    for (const idx of candidates) {
        if (!state.visited.has(idx)) {
            return idx;
        }
    }
    return -1;
}

function quantize(x: number, y: number): number {
    const qx = Math.round(x * QUANTIZE_PRECISION) | 0;
    const qy = Math.round(y * QUANTIZE_PRECISION) | 0;
    return qy * Y_SHIFT + qx;
}

export function chaikinSmooth(ring: Point2D[], passes: number): Point2D[] {
    let current = ring;
    for (let i = 0; i < passes; i++) {
        current = chaikinPass(current);
    }
    return current;
}

/**
 * Taubin low-pass smoothing. Each round runs a Laplacian step (lambda > 0,
 * shrinks the contour slightly toward neighbour averages) followed by an
 * inverse step (mu < 0, pushes back outward with slightly larger magnitude).
 * Net effect: high-frequency micro-wobble inherited from pixel-grid
 * marching-squares output is averaged away, while macro-shape is preserved.
 */
export function taubinSmooth(ring: Point2D[], rounds: number, lambda = 0.5, mu = -0.53): Point2D[] {
    if (rounds <= 0 || ring.length < 3) {
        return ring;
    }
    let current: Point2D[] = ring.map((p) => ({ x: p.x, y: p.y }));
    for (let r = 0; r < rounds; r++) {
        current = laplacianStep(current, lambda);
        current = laplacianStep(current, mu);
    }
    return current;
}

function laplacianStep(ring: Point2D[], factor: number): Point2D[] {
    const out: Point2D[] = new Array(ring.length);
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const prev = ring[(i - 1 + n) % n];
        const curr = ring[i];
        const next = ring[(i + 1) % n];
        const targetX = (prev.x + next.x) * 0.5;
        const targetY = (prev.y + next.y) * 0.5;
        out[i] = {
            x: curr.x + factor * (targetX - curr.x),
            y: curr.y + factor * (targetY - curr.y),
        };
    }
    return out;
}

/**
 * Corner-preserving line flattening. Walks the ring and marks vertices where
 * the in/out edge angle deviates by more than `thresholdDegrees` as real
 * corners. Between consecutive corners, every intermediate vertex is the
 * marching-squares pixel-wobble, so project them onto the straight line
 * spanning the bracketing corner pair. The silhouette's actual corners stay
 * untouched; everything between becomes a flat panel. Side wall along that
 * panel is then necessarily one planar quad-strip — zero shading variation.
 *
 * thresholdDegrees=0 or >=180 disables the algorithm (no corners detected).
 */
export function flattenBetweenCorners(ring: Point2D[], thresholdDegrees: number): Point2D[] {
    if (thresholdDegrees <= 0 || thresholdDegrees >= 180 || ring.length < 4) {
        return ring;
    }
    const n = ring.length;
    const cosThreshold = Math.cos((thresholdDegrees * Math.PI) / 180);
    const corners: number[] = [];
    for (let i = 0; i < n; i++) {
        const prev = ring[(i - 1 + n) % n];
        const curr = ring[i];
        const next = ring[(i + 1) % n];
        const inX = curr.x - prev.x;
        const inY = curr.y - prev.y;
        const outX = next.x - curr.x;
        const outY = next.y - curr.y;
        const inLen = Math.sqrt(inX * inX + inY * inY);
        const outLen = Math.sqrt(outX * outX + outY * outY);
        if (inLen <= 0 || outLen <= 0) {
            continue;
        }
        const cosAngle = (inX * outX + inY * outY) / (inLen * outLen);
        if (cosAngle < cosThreshold) {
            corners.push(i);
        }
    }
    if (corners.length < 2) {
        return ring;
    }
    const out: Point2D[] = ring.map((p) => ({ x: p.x, y: p.y }));
    for (let k = 0; k < corners.length; k++) {
        const c1Idx = corners[k];
        const c2Idx = corners[(k + 1) % corners.length];
        const c1 = ring[c1Idx];
        const c2 = ring[c2Idx];
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq <= 0) {
            continue;
        }
        let i = (c1Idx + 1) % n;
        let safety = 0;
        while (i !== c2Idx && safety <= n + 1) {
            const p = ring[i];
            const t = ((p.x - c1.x) * dx + (p.y - c1.y) * dy) / lenSq;
            out[i].x = c1.x + t * dx;
            out[i].y = c1.y + t * dy;
            i = (i + 1) % n;
            safety++;
        }
    }
    return out;
}

function chaikinPass(ring: Point2D[]): Point2D[] {
    if (ring.length < 3) {
        return ring;
    }
    const out: Point2D[] = [];
    for (let i = 0; i < ring.length; i++) {
        const p0 = ring[i];
        const p1 = ring[(i + 1) % ring.length];
        out.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
        out.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
    }
    return out;
}

function polygonArea(ring: Point2D[]): number {
    let sum = 0;
    for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return sum / 2;
}

export function buildPolygons(rings: Point2D[][]): Polygon[] {
    if (rings.length === 0) {
        return [];
    }
    // Containment-depth classification: a ring is an OUTER if nested at even
    // depth (0, 2, 4...), a HOLE if at odd depth. Works for both raster
    // marching-squares output and SVG/font-glyph paths regardless of source
    // winding convention. After classification, normalize winding so the
    // triangulator receives outers with area < 0 and holes with area > 0.
    const depths = rings.map((ring) => {
        const sample = ring[0];
        let depth = 0;
        for (let i = 0; i < rings.length; i++) {
            if (rings[i] === ring) continue;
            if (pointInRing(sample, rings[i])) depth++;
        }
        return depth;
    });
    const outers: { ring: Point2D[]; depth: number }[] = [];
    const holes: { ring: Point2D[]; depth: number }[] = [];
    for (let i = 0; i < rings.length; i++) {
        const entry = { ring: rings[i], depth: depths[i] };
        if (depths[i] % 2 === 0) outers.push(entry);
        else holes.push(entry);
    }
    return outers.map((outer) => ({
        outer: normalizeRingDirection(outer.ring, true),
        holes: holes
            .filter((h) => h.depth === outer.depth + 1 && pointInRing(h.ring[0], outer.ring))
            .map((h) => normalizeRingDirection(h.ring, false)),
    }));
}

function normalizeRingDirection(ring: Point2D[], wantOuter: boolean): Point2D[] {
    const currentlyOuterDir = polygonArea(ring) < 0;
    return currentlyOuterDir === wantOuter ? ring : ring.slice().reverse();
}

function pointInRing(point: Point2D, ring: Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i];
        const b = ring[j];
        const intersects =
            a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}
