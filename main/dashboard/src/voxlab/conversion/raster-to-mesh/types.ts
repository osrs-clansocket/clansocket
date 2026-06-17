import type { PackageLogger } from "./logger.js";

export interface ImageDataLike {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export interface RasterToMeshOptions {
    imageData: ImageDataLike;
    voxelResolution?: number;
    extrusionDepth?: number;
    smoothingPasses?: number;
    taubinRounds?: number;
    taubinLambda?: number;
    taubinMu?: number;
    cornerAngleDegrees?: number;
    alphaThreshold?: number;
    vertexColor?: readonly [number, number, number];
    backFace?: boolean;
    normalize?: boolean;
    logger?: PackageLogger;
}

export interface MeshBounds {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
}

export interface MeshGroupBoundaries {
    frontIndexEnd: number;
    backIndexEnd: number;
    sideIndexEnd: number;
}

export interface MeshMetadata {
    vertexCount: number;
    triangleCount: number;
    bounds: MeshBounds;
    voxelResolution: number;
    extrusionDepth: number;
    groupBoundaries?: MeshGroupBoundaries;
}

export interface MeshAttributes {
    positions: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    colors: Float32Array;
    uvs?: Float32Array;
}

export interface MeshData extends MeshAttributes {
    metadata: MeshMetadata;
}

export interface Point2D {
    x: number;
    y: number;
}

export interface EdgeSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface Polygon {
    outer: Point2D[];
    holes: Point2D[][];
}
