import { Color, Vector3, type BufferAttribute } from "three";
import type { GradientAxis, GradientSpec, GradientStop, PaintOverride } from "../../shared/types/voxlab/paint-types.js";

export function gradientMapper(
    positions: BufferAttribute,
    targetVertices: ReadonlySet<number>,
    spec: GradientSpec,
): PaintOverride[] {
    if (targetVertices.size === 0 || spec.stops.length === 0) {
        return [];
    }
    const sortedStops = [...spec.stops].sort((a, b) => a.position - b.position);
    const stopColors = sortedStops.map((s) => new Color(s.color));
    const v = new Vector3();

    if (spec.type === "linear") {
        return computeLinearGradient(positions, targetVertices, spec.axis, sortedStops, stopColors, v);
    }
    return computeRadialGradient(positions, targetVertices, sortedStops, stopColors, v);
}

function computeLinearGradient(
    positions: BufferAttribute,
    targetVertices: ReadonlySet<number>,
    axis: GradientAxis,
    sortedStops: ReadonlyArray<GradientStop>,
    stopColors: ReadonlyArray<Color>,
    scratch: Vector3,
): PaintOverride[] {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const idx of targetVertices) {
        scratch.fromBufferAttribute(positions, idx);
        const val = getAxisValue(scratch, axis);
        if (val < minVal) {
            minVal = val;
        }
        if (val > maxVal) {
            maxVal = val;
        }
    }
    const range = maxVal - minVal;
    if (range === 0) {
        return [];
    }
    const overrides: PaintOverride[] = [];
    for (const idx of targetVertices) {
        scratch.fromBufferAttribute(positions, idx);
        const val = getAxisValue(scratch, axis);
        const t = (val - minVal) / range;
        overrides.push(buildOverride(idx, t, sortedStops, stopColors));
    }
    return overrides;
}

function computeRadialGradient(
    positions: BufferAttribute,
    targetVertices: ReadonlySet<number>,
    sortedStops: ReadonlyArray<GradientStop>,
    stopColors: ReadonlyArray<Color>,
    scratch: Vector3,
): PaintOverride[] {
    let centerX = 0;
    let centerY = 0;
    let centerZ = 0;
    for (const idx of targetVertices) {
        scratch.fromBufferAttribute(positions, idx);
        centerX += scratch.x;
        centerY += scratch.y;
        centerZ += scratch.z;
    }
    const count = targetVertices.size;
    centerX /= count;
    centerY /= count;
    centerZ /= count;
    let maxDistSq = 0;
    for (const idx of targetVertices) {
        scratch.fromBufferAttribute(positions, idx);
        const dx = scratch.x - centerX;
        const dy = scratch.y - centerY;
        const dz = scratch.z - centerZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > maxDistSq) {
            maxDistSq = distSq;
        }
    }
    const maxDist = Math.sqrt(maxDistSq);
    if (maxDist === 0) {
        return [];
    }
    const overrides: PaintOverride[] = [];
    for (const idx of targetVertices) {
        scratch.fromBufferAttribute(positions, idx);
        const dx = scratch.x - centerX;
        const dy = scratch.y - centerY;
        const dz = scratch.z - centerZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const t = dist / maxDist;
        overrides.push(buildOverride(idx, t, sortedStops, stopColors));
    }
    return overrides;
}

function buildOverride(
    vertexIndex: number,
    t: number,
    sortedStops: ReadonlyArray<GradientStop>,
    stopColors: ReadonlyArray<Color>,
): PaintOverride {
    const lastIdx = sortedStops.length - 1;
    if (t <= sortedStops[0].position) {
        const c = stopColors[0];
        return { vertexIndex, rgb: [c.r, c.g, c.b] };
    }
    if (t >= sortedStops[lastIdx].position) {
        const c = stopColors[lastIdx];
        return { vertexIndex, rgb: [c.r, c.g, c.b] };
    }
    for (let i = 0; i < lastIdx; i++) {
        const a = sortedStops[i];
        const b = sortedStops[i + 1];
        if (t >= a.position && t <= b.position) {
            const stopRange = b.position - a.position;
            const local = stopRange === 0 ? 0 : (t - a.position) / stopRange;
            const ca = stopColors[i];
            const cb = stopColors[i + 1];
            return {
                vertexIndex,
                rgb: [ca.r + (cb.r - ca.r) * local, ca.g + (cb.g - ca.g) * local, ca.b + (cb.b - ca.b) * local],
            };
        }
    }
    const fallback = stopColors[lastIdx];
    return { vertexIndex, rgb: [fallback.r, fallback.g, fallback.b] };
}

function getAxisValue(v: Vector3, axis: GradientAxis): number {
    if (axis === "x") {
        return v.x;
    }
    if (axis === "y") {
        return v.y;
    }
    return v.z;
}
