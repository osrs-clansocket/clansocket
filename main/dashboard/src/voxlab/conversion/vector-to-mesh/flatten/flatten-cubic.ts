import type { Point2D } from "../../raster-to-mesh/types.js";
import { DEFAULT_MAX_SUBDIVISION_DEPTH } from "../constants/defaults.js";

export interface CubicBezier {
    p0: Point2D;
    p1: Point2D;
    p2: Point2D;
    p3: Point2D;
}

export function flattenCubic(bez: CubicBezier, tolerance: number, out: Point2D[]): void {
    subdivide(bez, tolerance, DEFAULT_MAX_SUBDIVISION_DEPTH, out);
}

function subdivide(b: CubicBezier, tol: number, depth: number, out: Point2D[]): void {
    if (depth <= 0 || isFlat(b, tol)) {
        out.push({ x: b.p3.x, y: b.p3.y });
        return;
    }
    const [left, right] = splitCubic(b);
    subdivide(left, tol, depth - 1, out);
    subdivide(right, tol, depth - 1, out);
}

function isFlat(b: CubicBezier, tol: number): boolean {
    const ax = b.p3.x - b.p0.x;
    const ay = b.p3.y - b.p0.y;
    const d1 = perpDist(b.p1, b.p0, ax, ay);
    const d2 = perpDist(b.p2, b.p0, ax, ay);
    return Math.max(d1, d2) <= tol;
}

function perpDist(p: Point2D, anchor: Point2D, ax: number, ay: number): number {
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;
    const cross = Math.abs(dx * ay - dy * ax);
    const len = Math.sqrt(ax * ax + ay * ay);
    return len > 0 ? cross / len : Math.sqrt(dx * dx + dy * dy);
}

function splitCubic(b: CubicBezier): [CubicBezier, CubicBezier] {
    const m01 = midpoint(b.p0, b.p1);
    const m12 = midpoint(b.p1, b.p2);
    const m23 = midpoint(b.p2, b.p3);
    const m012 = midpoint(m01, m12);
    const m123 = midpoint(m12, m23);
    const m = midpoint(m012, m123);
    return [
        { p0: b.p0, p1: m01, p2: m012, p3: m },
        { p0: m, p1: m123, p2: m23, p3: b.p3 },
    ];
}

function midpoint(a: Point2D, b: Point2D): Point2D {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
