import type { Point2D } from "../../raster-to-mesh/types.js";
import { DEFAULT_MAX_SUBDIVISION_DEPTH } from "../constants/defaults.js";

export interface QuadraticBezier {
    p0: Point2D;
    p1: Point2D;
    p2: Point2D;
}

export function flattenQuadratic(bez: QuadraticBezier, tolerance: number, out: Point2D[]): void {
    subdivide(bez, tolerance, DEFAULT_MAX_SUBDIVISION_DEPTH, out);
}

function subdivide(b: QuadraticBezier, tol: number, depth: number, out: Point2D[]): void {
    if (depth <= 0 || isFlat(b, tol)) {
        out.push({ x: b.p2.x, y: b.p2.y });
        return;
    }
    const [left, right] = splitQuadratic(b);
    subdivide(left, tol, depth - 1, out);
    subdivide(right, tol, depth - 1, out);
}

function isFlat(b: QuadraticBezier, tol: number): boolean {
    const ax = b.p2.x - b.p0.x;
    const ay = b.p2.y - b.p0.y;
    const dx = b.p1.x - b.p0.x;
    const dy = b.p1.y - b.p0.y;
    const cross = Math.abs(dx * ay - dy * ax);
    const len = Math.sqrt(ax * ax + ay * ay);
    return (len > 0 ? cross / len : Math.sqrt(dx * dx + dy * dy)) <= tol;
}

function splitQuadratic(b: QuadraticBezier): [QuadraticBezier, QuadraticBezier] {
    const m01 = midpoint(b.p0, b.p1);
    const m12 = midpoint(b.p1, b.p2);
    const m = midpoint(m01, m12);
    return [
        { p0: b.p0, p1: m01, p2: m },
        { p0: m, p1: m12, p2: b.p2 },
    ];
}

function midpoint(a: Point2D, b: Point2D): Point2D {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
