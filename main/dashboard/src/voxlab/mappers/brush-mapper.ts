import { Vector3, type BufferAttribute } from "three";
import { HALVING_FACTOR } from "../../shared/constants/voxlab/texture-paint-constants.js";

export interface BrushHit {
    vertexIndex: number;
    weight: number;
}

export interface BrushMapperOptions {
    normals?: BufferAttribute;
    cameraPos?: Vector3;
    hideBackFaces?: boolean;
}

const scratchV = new Vector3();
const scratchDir = new Vector3();
const scratchNormal = new Vector3();
const sharedHits: BrushHit[] = [];

export function brushMapper(
    hitWorldPoint: Vector3,
    positions: BufferAttribute,
    radius: number,
    falloffSigma: number,
    candidateIndices: ReadonlyArray<number> | null,
    options?: BrushMapperOptions,
): BrushHit[] {
    sharedHits.length = 0;
    const radiusSq = radius * radius;
    const sigmaWorld = falloffSigma * radius;
    const sigmaSq = sigmaWorld * sigmaWorld;
    const denom = HALVING_FACTOR * sigmaSq;
    const hideBackFaces =
        options?.hideBackFaces === true && options.normals !== undefined && options.cameraPos !== undefined;
    const normals = options?.normals;
    const cameraPos = options?.cameraPos;
    const checkVertex = (i: number): void => {
        scratchV.fromBufferAttribute(positions, i);
        const distSq = scratchV.distanceToSquared(hitWorldPoint);
        if (distSq > radiusSq) {
            return;
        }
        if (hideBackFaces && normals && cameraPos) {
            scratchNormal.fromBufferAttribute(normals, i);
            scratchDir.copy(scratchV).sub(cameraPos);
            if (scratchDir.dot(scratchNormal) > 0) {
                return;
            }
        }
        const weight = Math.exp(-distSq / denom);
        sharedHits.push({ vertexIndex: i, weight });
    };
    if (candidateIndices !== null) {
        for (const i of candidateIndices) {
            checkVertex(i);
        }
    } else {
        for (let i = 0; i < positions.count; i++) {
            checkVertex(i);
        }
    }
    return sharedHits;
}

const CELL_KEY_RANGE = 1024;
const CELL_KEY_OFFSET = 512;
const CELL_KEY_RANGE_SQ = CELL_KEY_RANGE * CELL_KEY_RANGE;

export class VertexHashGrid {
    private readonly cells = new Map<number, number[]>();
    private readonly resultBuffer: number[] = [];

    constructor(
        positions: BufferAttribute,
        private readonly cellSize: number,
    ) {
        const v = new Vector3();
        for (let i = 0; i < positions.count; i++) {
            v.fromBufferAttribute(positions, i);
            const key = this.cellKey(v.x, v.y, v.z);
            const list = this.cells.get(key);
            if (list) {
                list.push(i);
            } else {
                this.cells.set(key, [i]);
            }
        }
    }

    queryRadius(point: Vector3, radius: number): number[] {
        this.resultBuffer.length = 0;
        const cellsRadius = Math.ceil(radius / this.cellSize);
        const cx = Math.floor(point.x / this.cellSize);
        const cy = Math.floor(point.y / this.cellSize);
        const cz = Math.floor(point.z / this.cellSize);
        for (let dx = -cellsRadius; dx <= cellsRadius; dx++) {
            for (let dy = -cellsRadius; dy <= cellsRadius; dy++) {
                for (let dz = -cellsRadius; dz <= cellsRadius; dz++) {
                    const key = this.cellKeyFromIndex(cx + dx, cy + dy, cz + dz);
                    const list = this.cells.get(key);
                    if (list !== undefined) {
                        for (const idx of list) {
                            this.resultBuffer.push(idx);
                        }
                    }
                }
            }
        }
        return this.resultBuffer;
    }

    private cellKey(x: number, y: number, z: number): number {
        return this.cellKeyFromIndex(
            Math.floor(x / this.cellSize),
            Math.floor(y / this.cellSize),
            Math.floor(z / this.cellSize),
        );
    }

    private cellKeyFromIndex(gx: number, gy: number, gz: number): number {
        return (
            (gx + CELL_KEY_OFFSET) * CELL_KEY_RANGE_SQ +
            (gy + CELL_KEY_OFFSET) * CELL_KEY_RANGE +
            (gz + CELL_KEY_OFFSET)
        );
    }
}
