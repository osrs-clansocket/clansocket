import type { MeshData } from "./types.js";

const MAGIC_K = 0x4b;
const MAGIC_M = 0x4d;
const MAGIC_S = 0x53;
const MAGIC_H = 0x48;

export const BINARY_FORMAT_VERSION = 1;
export const BINARY_HEADER_BYTES = 48;
export const BINARY_MAGIC = "KMSH";

const F32_BYTES = 4;
const U32_BYTES = 4;
const POSITION_STRIDE = 3 * F32_BYTES;
const INDEX_STRIDE = 3 * U32_BYTES;
const NORMAL_STRIDE = 3 * F32_BYTES;
const COLOR_STRIDE = 3 * F32_BYTES;

const HEADER_OFFSET_MAGIC = 0;
const HEADER_OFFSET_VERSION = 4;
const HEADER_OFFSET_VERTEX_COUNT = 8;
const HEADER_OFFSET_TRIANGLE_COUNT = 12;
const HEADER_OFFSET_BOUNDS_MIN = 16;
const HEADER_OFFSET_BOUNDS_MAX = 28;
const HEADER_OFFSET_VOXEL_RESOLUTION = 40;
const HEADER_OFFSET_EXTRUSION_DEPTH = 44;

export function serializeBinary(mesh: MeshData): Uint8Array {
    const { vertexCount, triangleCount } = mesh.metadata;
    assertExpectedSizes(mesh, vertexCount, triangleCount);

    const positionsBytes = vertexCount * POSITION_STRIDE;
    const indicesBytes = triangleCount * INDEX_STRIDE;
    const normalsBytes = vertexCount * NORMAL_STRIDE;
    const colorsBytes = vertexCount * COLOR_STRIDE;
    const totalBytes = BINARY_HEADER_BYTES + positionsBytes + indicesBytes + normalsBytes + colorsBytes;

    const buffer = new ArrayBuffer(totalBytes);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    bytes[HEADER_OFFSET_MAGIC] = MAGIC_K;
    bytes[HEADER_OFFSET_MAGIC + 1] = MAGIC_M;
    bytes[HEADER_OFFSET_MAGIC + 2] = MAGIC_S;
    bytes[HEADER_OFFSET_MAGIC + 3] = MAGIC_H;
    view.setUint32(HEADER_OFFSET_VERSION, BINARY_FORMAT_VERSION, true);
    view.setUint32(HEADER_OFFSET_VERTEX_COUNT, vertexCount, true);
    view.setUint32(HEADER_OFFSET_TRIANGLE_COUNT, triangleCount, true);
    view.setFloat32(HEADER_OFFSET_BOUNDS_MIN, mesh.metadata.bounds.min[0], true);
    view.setFloat32(HEADER_OFFSET_BOUNDS_MIN + 4, mesh.metadata.bounds.min[1], true);
    view.setFloat32(HEADER_OFFSET_BOUNDS_MIN + 8, mesh.metadata.bounds.min[2], true);
    view.setFloat32(HEADER_OFFSET_BOUNDS_MAX, mesh.metadata.bounds.max[0], true);
    view.setFloat32(HEADER_OFFSET_BOUNDS_MAX + 4, mesh.metadata.bounds.max[1], true);
    view.setFloat32(HEADER_OFFSET_BOUNDS_MAX + 8, mesh.metadata.bounds.max[2], true);
    view.setUint32(HEADER_OFFSET_VOXEL_RESOLUTION, mesh.metadata.voxelResolution, true);
    view.setFloat32(HEADER_OFFSET_EXTRUSION_DEPTH, mesh.metadata.extrusionDepth, true);

    let offset = BINARY_HEADER_BYTES;
    bytes.set(asBytes(mesh.positions), offset);
    offset += positionsBytes;
    bytes.set(asBytes(mesh.indices), offset);
    offset += indicesBytes;
    bytes.set(asBytes(mesh.normals), offset);
    offset += normalsBytes;
    bytes.set(asBytes(mesh.colors), offset);

    return bytes;
}

export function parseBinary(input: ArrayBuffer | Uint8Array): MeshData {
    const aligned = alignToFreshBuffer(input);
    const bytes = new Uint8Array(aligned);
    const view = new DataView(aligned);

    if (bytes.length < BINARY_HEADER_BYTES) {
        throw new Error(
            `@voxlab/raster-to-mesh: parseBinary input is ${bytes.length} bytes — header alone is ${BINARY_HEADER_BYTES}`,
        );
    }
    if (
        bytes[HEADER_OFFSET_MAGIC] !== MAGIC_K ||
        bytes[HEADER_OFFSET_MAGIC + 1] !== MAGIC_M ||
        bytes[HEADER_OFFSET_MAGIC + 2] !== MAGIC_S ||
        bytes[HEADER_OFFSET_MAGIC + 3] !== MAGIC_H
    ) {
        throw new Error(`@voxlab/raster-to-mesh: parseBinary input does not start with ${BINARY_MAGIC} magic bytes`);
    }
    const version = view.getUint32(HEADER_OFFSET_VERSION, true);
    if (version !== BINARY_FORMAT_VERSION) {
        throw new Error(
            `@voxlab/raster-to-mesh: parseBinary unsupported format version ${version} (this build expects ${BINARY_FORMAT_VERSION})`,
        );
    }
    const vertexCount = view.getUint32(HEADER_OFFSET_VERTEX_COUNT, true);
    const triangleCount = view.getUint32(HEADER_OFFSET_TRIANGLE_COUNT, true);
    const bounds = {
        min: [
            view.getFloat32(HEADER_OFFSET_BOUNDS_MIN, true),
            view.getFloat32(HEADER_OFFSET_BOUNDS_MIN + 4, true),
            view.getFloat32(HEADER_OFFSET_BOUNDS_MIN + 8, true),
        ] as const,
        max: [
            view.getFloat32(HEADER_OFFSET_BOUNDS_MAX, true),
            view.getFloat32(HEADER_OFFSET_BOUNDS_MAX + 4, true),
            view.getFloat32(HEADER_OFFSET_BOUNDS_MAX + 8, true),
        ] as const,
    };
    const voxelResolution = view.getUint32(HEADER_OFFSET_VOXEL_RESOLUTION, true);
    const extrusionDepth = view.getFloat32(HEADER_OFFSET_EXTRUSION_DEPTH, true);

    const positionsBytes = vertexCount * POSITION_STRIDE;
    const indicesBytes = triangleCount * INDEX_STRIDE;
    const normalsBytes = vertexCount * NORMAL_STRIDE;
    const colorsBytes = vertexCount * COLOR_STRIDE;
    const expectedTotal = BINARY_HEADER_BYTES + positionsBytes + indicesBytes + normalsBytes + colorsBytes;
    if (bytes.length !== expectedTotal) {
        throw new Error(
            `@voxlab/raster-to-mesh: parseBinary input length ${bytes.length} does not match expected ${expectedTotal} for vertexCount=${vertexCount}, triangleCount=${triangleCount}`,
        );
    }

    let offset = BINARY_HEADER_BYTES;
    const positions = new Float32Array(aligned, offset, vertexCount * 3);
    offset += positionsBytes;
    const indices = new Uint32Array(aligned, offset, triangleCount * 3);
    offset += indicesBytes;
    const normals = new Float32Array(aligned, offset, vertexCount * 3);
    offset += normalsBytes;
    const colors = new Float32Array(aligned, offset, vertexCount * 3);

    return {
        positions,
        indices,
        normals,
        colors,
        metadata: {
            vertexCount,
            triangleCount,
            bounds,
            voxelResolution,
            extrusionDepth,
        },
    };
}

export function serializeJson(mesh: MeshData): string {
    return JSON.stringify({
        positions: Array.from(mesh.positions),
        indices: Array.from(mesh.indices),
        normals: Array.from(mesh.normals),
        colors: Array.from(mesh.colors),
        metadata: mesh.metadata,
    });
}

export function parseJson(text: string): MeshData {
    const raw = JSON.parse(text);
    return {
        positions: new Float32Array(raw.positions),
        indices: new Uint32Array(raw.indices),
        normals: new Float32Array(raw.normals),
        colors: new Float32Array(raw.colors),
        metadata: raw.metadata,
    };
}

function asBytes(view: Float32Array | Uint32Array): Uint8Array {
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function alignToFreshBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
    if (input instanceof Uint8Array) {
        const src = input.buffer;
        if (src instanceof ArrayBuffer) {
            return src.slice(input.byteOffset, input.byteOffset + input.byteLength);
        }
        const copy = new ArrayBuffer(input.byteLength);
        new Uint8Array(copy).set(input);
        return copy;
    }
    return input;
}

function assertExpectedSizes(mesh: MeshData, vertexCount: number, triangleCount: number): void {
    const expectedFloatLen = vertexCount * 3;
    const expectedIndexLen = triangleCount * 3;
    if (mesh.positions.length !== expectedFloatLen) {
        throw new Error(
            `@voxlab/raster-to-mesh: serializeBinary positions length ${mesh.positions.length} does not match vertexCount*3=${expectedFloatLen}`,
        );
    }
    if (mesh.indices.length !== expectedIndexLen) {
        throw new Error(
            `@voxlab/raster-to-mesh: serializeBinary indices length ${mesh.indices.length} does not match triangleCount*3=${expectedIndexLen}`,
        );
    }
    if (mesh.normals.length !== expectedFloatLen) {
        throw new Error(
            `@voxlab/raster-to-mesh: serializeBinary normals length ${mesh.normals.length} does not match vertexCount*3=${expectedFloatLen}`,
        );
    }
    if (mesh.colors.length !== expectedFloatLen) {
        throw new Error(
            `@voxlab/raster-to-mesh: serializeBinary colors length ${mesh.colors.length} does not match vertexCount*3=${expectedFloatLen}`,
        );
    }
}
