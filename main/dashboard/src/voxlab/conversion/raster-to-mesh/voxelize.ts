import type { SampleGrid } from "./sample.js";

const RGB_STRIDE = 3;
const OPAQUE_THRESHOLD = 0.95;

export interface VoxelGrid {
    mask: Uint8Array;
    alpha: Float32Array;
    rgb: Float32Array;
    resolution: number;
    aspectRatio: number;
    width: number;
    height: number;
    cellSize: number;
    border: number;
}

const BORDER = 1;

export function voxelize(grid: SampleGrid, resolution: number, alphaThreshold: number): VoxelGrid {
    const { alpha: srcAlpha, rgb: srcRgb, width: srcW, height: srcH } = grid;
    const longest = Math.max(srcW, srcH);
    const cellSize = longest / resolution;
    const coreW = Math.max(1, Math.round(srcW / cellSize));
    const coreH = Math.max(1, Math.round(srcH / cellSize));
    const outW = coreW + BORDER * 2;
    const outH = coreH + BORDER * 2;
    const total = outW * outH;
    const alpha = new Float32Array(total);
    const rgb = new Float32Array(total * RGB_STRIDE);
    downsampleCells(
        { srcAlpha, srcRgb, srcW, srcH, cellSize },
        { dstAlpha: alpha, dstRgb: rgb, dstW: coreW, dstH: coreH, padW: outW, padOffsetX: BORDER, padOffsetY: BORDER },
    );
    const mask = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
        mask[i] = alpha[i] >= alphaThreshold ? 1 : 0;
    }
    return {
        mask,
        alpha,
        rgb,
        resolution: Math.max(outW, outH),
        aspectRatio: outW / outH,
        width: outW,
        height: outH,
        cellSize,
        border: BORDER,
    };
}

interface SourceGrid {
    srcAlpha: Float32Array;
    srcRgb: Float32Array;
    srcW: number;
    srcH: number;
    cellSize: number;
}

interface DestinationGrid {
    dstAlpha: Float32Array;
    dstRgb: Float32Array;
    dstW: number;
    dstH: number;
    padW: number;
    padOffsetX: number;
    padOffsetY: number;
}

function downsampleCells(source: SourceGrid, dest: DestinationGrid): void {
    for (let dy = 0; dy < dest.dstH; dy++) {
        for (let dx = 0; dx < dest.dstW; dx++) {
            const outIdx = (dy + dest.padOffsetY) * dest.padW + (dx + dest.padOffsetX);
            const cell = averageCell(source, dx, dy);
            dest.dstAlpha[outIdx] = cell.alpha;
            const rgbOut = outIdx * RGB_STRIDE;
            dest.dstRgb[rgbOut] = cell.r;
            dest.dstRgb[rgbOut + 1] = cell.g;
            dest.dstRgb[rgbOut + 2] = cell.b;
        }
    }
}

interface CellAverage {
    alpha: number;
    r: number;
    g: number;
    b: number;
}

function averageCell(source: SourceGrid, dx: number, dy: number): CellAverage {
    const sx0 = Math.floor(dx * source.cellSize);
    const sy0 = Math.floor(dy * source.cellSize);
    const sx1 = Math.min(source.srcW, Math.ceil((dx + 1) * source.cellSize));
    const sy1 = Math.min(source.srcH, Math.ceil((dy + 1) * source.cellSize));
    let sumAlpha = 0;
    let totalCount = 0;
    let sumOpaqueR = 0;
    let sumOpaqueG = 0;
    let sumOpaqueB = 0;
    let opaqueCount = 0;
    let sumAllR = 0;
    let sumAllG = 0;
    let sumAllB = 0;
    for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
            const idx = sy * source.srcW + sx;
            const a = source.srcAlpha[idx];
            sumAlpha += a;
            totalCount++;
            const rgbIdx = idx * RGB_STRIDE;
            const r = source.srcRgb[rgbIdx];
            const g = source.srcRgb[rgbIdx + 1];
            const b = source.srcRgb[rgbIdx + 2];
            sumAllR += r;
            sumAllG += g;
            sumAllB += b;
            if (a >= OPAQUE_THRESHOLD) {
                sumOpaqueR += r;
                sumOpaqueG += g;
                sumOpaqueB += b;
                opaqueCount++;
            }
        }
    }
    if (totalCount === 0) {
        return { alpha: 0, r: 0, g: 0, b: 0 };
    }
    const alpha = sumAlpha / totalCount;
    if (opaqueCount > 0) {
        return {
            alpha,
            r: sumOpaqueR / opaqueCount,
            g: sumOpaqueG / opaqueCount,
            b: sumOpaqueB / opaqueCount,
        };
    }
    return {
        alpha,
        r: sumAllR / totalCount,
        g: sumAllG / totalCount,
        b: sumAllB / totalCount,
    };
}

export function gridDimensions(grid: VoxelGrid): { width: number; height: number } {
    return { width: grid.width, height: grid.height };
}
