import type { ExtrudedMesh } from "./extrude.js";
import type { MeshBounds, MeshData, MeshGroupBoundaries } from "./types.js";
import type { VoxelGrid } from "./voxelize.js";

const POSITION_STRIDE = 3;
const UV_STRIDE = 2;
const RGB_STRIDE = 3;
const MIN_UV_DENOMINATOR = 1e-6;
const MAX_CELL_SEARCH_RADIUS = 16;

interface ExportOptions {
    color: readonly [number, number, number];
    voxelResolution: number;
    extrusionDepth: number;
    normalize: boolean;
    voxel?: VoxelGrid;
}

export function buildMeshData(mesh: ExtrudedMesh, options: ExportOptions): MeshData {
    const initialBounds = computeBounds(mesh.positions);
    const positions = options.normalize ? normalizePositions(mesh.positions, initialBounds) : mesh.positions.slice();
    // Normals were computed at extrude time per region (front=+Z, back=-Z, side=outward
    // tangent perpendicular). Normalize only mirrors Y, so the only adjustment needed
    // is flipping the Y component of every normal so it stays in sync with the
    // mirrored positions.
    const normals = options.normalize ? mirrorYNormals(mesh.normals) : mesh.normals.slice();
    const colors = options.voxel
        ? buildColorsFromVoxel(mesh.positions, options.voxel)
        : buildColors(positions.length / POSITION_STRIDE, options.color);
    const uvs = buildPerFaceUvs(positions, mesh.indices, mesh.groupBoundaries);
    const finalBounds = options.normalize ? computeBounds(positions) : initialBounds;
    return {
        positions,
        indices: mesh.indices.slice(),
        normals,
        colors,
        uvs,
        metadata: {
            vertexCount: positions.length / POSITION_STRIDE,
            triangleCount: mesh.indices.length / 3,
            bounds: finalBounds,
            voxelResolution: options.voxelResolution,
            extrusionDepth: options.extrusionDepth,
            groupBoundaries: { ...mesh.groupBoundaries },
        },
    };
}

function normalizePositions(positions: Float32Array, bounds: MeshBounds): Float32Array {
    const cx = (bounds.min[0] + bounds.max[0]) / 2;
    const cy = (bounds.min[1] + bounds.max[1]) / 2;
    const cz = (bounds.min[2] + bounds.max[2]) / 2;
    const rangeX = bounds.max[0] - bounds.min[0];
    const rangeY = bounds.max[1] - bounds.min[1];
    const longest = Math.max(rangeX, rangeY);
    const scale = longest > 0 ? 1 / longest : 1;
    const out = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
        out[i] = (positions[i] - cx) * scale;
        out[i + 1] = -(positions[i + 1] - cy) * scale;
        out[i + 2] = (positions[i + 2] - cz) * scale;
    }
    return out;
}

function mirrorYNormals(normals: Float32Array): Float32Array {
    const out = new Float32Array(normals.length);
    for (let i = 0; i < normals.length; i += 3) {
        out[i] = normals[i];
        out[i + 1] = -normals[i + 1];
        out[i + 2] = normals[i + 2];
    }
    return out;
}

function buildColors(vertexCount: number, color: readonly [number, number, number]): Float32Array {
    const out = new Float32Array(vertexCount * RGB_STRIDE);
    for (let i = 0; i < vertexCount; i++) {
        out[i * RGB_STRIDE] = color[0];
        out[i * RGB_STRIDE + 1] = color[1];
        out[i * RGB_STRIDE + 2] = color[2];
    }
    return out;
}

function buildPerFaceUvs(positions: Float32Array, indices: Uint32Array, boundaries: MeshGroupBoundaries): Float32Array {
    const vertexCount = positions.length / POSITION_STRIDE;
    const uvs = new Float32Array(vertexCount * UV_STRIDE);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < positions.length; i += POSITION_STRIDE) {
        const x = positions[i];
        const y = positions[i + 1];
        if (x < minX) {
            minX = x;
        }
        if (x > maxX) {
            maxX = x;
        }
        if (y < minY) {
            minY = y;
        }
        if (y > maxY) {
            maxY = y;
        }
    }
    const w = Math.max(MIN_UV_DENOMINATOR, maxX - minX);
    const h = Math.max(MIN_UV_DENOMINATOR, maxY - minY);

    const isBackVertex = new Set<number>();
    for (let i = boundaries.frontIndexEnd; i < boundaries.backIndexEnd; i++) {
        isBackVertex.add(indices[i]);
    }

    for (let v = 0; v < vertexCount; v++) {
        const x = positions[v * POSITION_STRIDE];
        const y = positions[v * POSITION_STRIDE + 1];
        const u = (x - minX) / w;
        const vV = (y - minY) / h;
        if (isBackVertex.has(v)) {
            uvs[v * UV_STRIDE] = 1 - u;
        } else {
            uvs[v * UV_STRIDE] = u;
        }
        uvs[v * UV_STRIDE + 1] = vV;
    }
    return uvs;
}

function buildColorsFromVoxel(positions: Float32Array, voxel: VoxelGrid): Float32Array {
    const vertexCount = positions.length / POSITION_STRIDE;
    const out = new Float32Array(vertexCount * RGB_STRIDE);
    const { width, height, rgb, mask } = voxel;
    const lastX = width - 1;
    const lastY = height - 1;
    for (let i = 0; i < vertexCount; i++) {
        const meshX = positions[i * POSITION_STRIDE];
        const meshY = positions[i * POSITION_STRIDE + 1];
        const cellX = Math.max(0, Math.min(lastX, Math.floor(meshX)));
        const cellY = Math.max(0, Math.min(lastY, Math.floor(meshY)));
        const cellIdx = cellY * width + cellX;
        const outBase = i * RGB_STRIDE;
        if (mask[cellIdx] === 1) {
            const ri = cellIdx * RGB_STRIDE;
            out[outBase] = rgb[ri];
            out[outBase + 1] = rgb[ri + 1];
            out[outBase + 2] = rgb[ri + 2];
            continue;
        }
        let found = false;
        for (let r = 1; r <= MAX_CELL_SEARCH_RADIUS && !found; r++) {
            for (let dy = -r; dy <= r && !found; dy++) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    const nx = Math.max(0, Math.min(lastX, cellX + dx));
                    const ny = Math.max(0, Math.min(lastY, cellY + dy));
                    const idx = ny * width + nx;
                    if (mask[idx] === 1) {
                        const ri = idx * RGB_STRIDE;
                        out[outBase] = rgb[ri];
                        out[outBase + 1] = rgb[ri + 1];
                        out[outBase + 2] = rgb[ri + 2];
                        found = true;
                    }
                }
            }
        }
    }
    return out;
}

function computeBounds(positions: Float32Array): MeshBounds {
    if (positions.length === 0) {
        return { min: [0, 0, 0], max: [0, 0, 0] };
    }
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        if (x < minX) {
            minX = x;
        }
        if (y < minY) {
            minY = y;
        }
        if (z < minZ) {
            minZ = z;
        }
        if (x > maxX) {
            maxX = x;
        }
        if (y > maxY) {
            maxY = y;
        }
        if (z > maxZ) {
            maxZ = z;
        }
    }
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}
