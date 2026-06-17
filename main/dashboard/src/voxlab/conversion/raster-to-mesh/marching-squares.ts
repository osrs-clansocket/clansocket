import type { EdgeSegment } from "./types.js";
import { gridDimensions, type VoxelGrid } from "./voxelize.js";

// Marching squares 16-case table.
// Each cell has 4 corners: top-left (bit 0), top-right (bit 1), bottom-right (bit 2), bottom-left (bit 3).
// Edge midpoints: 0=top, 1=right, 2=bottom, 3=left.
// Returns pairs of edge midpoints to connect for each of the 16 cases.
const EDGE_TABLE: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [],
    [[3, 0]],
    [[0, 1]],
    [[3, 1]],
    [[1, 2]],
    [
        [3, 0],
        [1, 2],
    ],
    [[0, 2]],
    [[3, 2]],
    [[2, 3]],
    [[2, 0]],
    [
        [0, 1],
        [2, 3],
    ],
    [[2, 1]],
    [[1, 3]],
    [[1, 0]],
    [[0, 3]],
    [],
];

export function marchingSquares(grid: VoxelGrid, alphaThreshold: number): EdgeSegment[] {
    const { width: w, height: h } = gridDimensions(grid);
    const { mask, alpha } = grid;
    const segments: EdgeSegment[] = [];
    for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
            const tl = mask[y * w + x];
            const tr = mask[y * w + (x + 1)];
            const br = mask[(y + 1) * w + (x + 1)];
            const bl = mask[(y + 1) * w + x];
            const code = tl | (tr << 1) | (br << 2) | (bl << 3);
            if (code === 0 || code === 15) {
                continue;
            }
            const corners = cornerAlpha({ alpha, w, x, y });
            const edges = edgePoints({ x, y, corners, threshold: alphaThreshold });
            for (const [a, b] of EDGE_TABLE[code]) {
                segments.push({ x1: edges[a].x, y1: edges[a].y, x2: edges[b].x, y2: edges[b].y });
            }
        }
    }
    return segments;
}

interface Corners {
    tl: number;
    tr: number;
    br: number;
    bl: number;
}

interface CornerInput {
    alpha: Float32Array;
    w: number;
    x: number;
    y: number;
}

function cornerAlpha(input: CornerInput): Corners {
    const { alpha, w, x, y } = input;
    return {
        tl: alpha[y * w + x],
        tr: alpha[y * w + (x + 1)],
        br: alpha[(y + 1) * w + (x + 1)],
        bl: alpha[(y + 1) * w + x],
    };
}

interface EdgePointInput {
    x: number;
    y: number;
    corners: Corners;
    threshold: number;
}

function edgePoints(input: EdgePointInput): { x: number; y: number }[] {
    const { x, y, corners: c, threshold: t } = input;
    const top = interp(c.tl, c.tr, t);
    const right = interp(c.tr, c.br, t);
    const bottom = interp(c.bl, c.br, t);
    const left = interp(c.tl, c.bl, t);
    return [
        { x: x + top, y },
        { x: x + 1, y: y + right },
        { x: x + bottom, y: y + 1 },
        { x, y: y + left },
    ];
}

function interp(a: number, b: number, t: number): number {
    const diff = b - a;
    if (Math.abs(diff) < 1e-9) {
        return 0.5;
    }
    const value = (t - a) / diff;
    return Math.max(0, Math.min(1, value));
}
