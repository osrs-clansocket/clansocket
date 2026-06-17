import { BufferAttribute, BufferGeometry } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MERGE_VERTICES_TOLERANCE } from "../../shared/constants/voxlab/material-constants.js";
import type { MeshData } from "../../shared/types/voxlab/mesh-types.js";

export const MATERIAL_GROUP_FRONT_BACK = 0;
export const MATERIAL_GROUP_SIDES = 1;

// Voxlab side of the bake → render pipeline. Everything that used to live here
// (Taubin smoothing, corner-flatten flattening, side vertex duplication, side
// normal recomputation) is now done in conversion/raster-to-mesh during the
// bake, so by the time mesh data reaches voxlab the positions are smooth, the
// side wall has its own duplicated vertices with proper outward normals, and
// the index buffer is partitioned into front/back/side regions via the
// metadata.groupBoundaries field. This file's only remaining job is to wire
// the buffer-attribute objects and create the two-material geometry groups.
export function buildGeometryFromMesh(meshData: MeshData, smoothShading: boolean): BufferGeometry {
    let geometry = new BufferGeometry();
    const positions = Float32Array.from(meshData.positions);
    const indices = Uint32Array.from(meshData.indices);
    const normals = Float32Array.from(meshData.normals);
    const colors = Float32Array.from(meshData.colors);
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new BufferAttribute(normals, 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    // Prefer mesh-time UVs when present (raster-to-mesh now emits them as part
    // of the MeshData contract). Fall back to runtime XY-projection for legacy
    // mesh JSON that predates the uvs field.
    const uvs = meshData.uvs !== undefined ? Float32Array.from(meshData.uvs) : generateUvs(positions);
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));

    geometry.clearGroups();
    const bounds = meshData.metadata.groupBoundaries;
    if (bounds) {
        const flatCount = bounds.backIndexEnd;
        const sideCount = bounds.sideIndexEnd - bounds.backIndexEnd;
        if (flatCount > 0) {
            geometry.addGroup(0, flatCount, MATERIAL_GROUP_FRONT_BACK);
        }
        if (sideCount > 0) {
            geometry.addGroup(flatCount, sideCount, MATERIAL_GROUP_SIDES);
        }
    } else {
        // Legacy mesh JSON (no groupBoundaries metadata): treat the whole index
        // buffer as the flat-material slot.
        if (indices.length > 0) {
            geometry.addGroup(0, indices.length, MATERIAL_GROUP_FRONT_BACK);
        }
    }

    if (smoothShading) {
        geometry = applySmoothShading(geometry);
    }
    geometry.computeBoundingBox();
    return geometry;
}

function generateUvs(positions: Float32Array): Float32Array {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    const w = Math.max(1e-6, maxX - minX);
    const h = Math.max(1e-6, maxY - minY);
    const vertexCount = positions.length / 3;
    const uvs = new Float32Array(vertexCount * 2);
    for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
        uvs[j] = (positions[i] - minX) / w;
        uvs[j + 1] = (positions[i + 1] - minY) / h;
    }
    return uvs;
}

function applySmoothShading(geometry: BufferGeometry): BufferGeometry {
    try {
        const merged = mergeVertices(geometry, MERGE_VERTICES_TOLERANCE);
        merged.computeVertexNormals();
        return merged;
    } catch (err) {
        console.error("[voxlab] smooth shading failed — falling back to flat", err);
        return geometry;
    }
}
