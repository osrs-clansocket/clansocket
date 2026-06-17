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
    voxelResolution?: number;
    extrusionDepth?: number;
    bounds: MeshBounds;
    groupBoundaries?: MeshGroupBoundaries;
}

export interface MeshData {
    positions: ArrayLike<number>;
    indices: ArrayLike<number>;
    normals: ArrayLike<number>;
    colors: ArrayLike<number>;
    uvs?: ArrayLike<number>;
    metadata: MeshMetadata;
}

export interface ImagePixels {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export interface LoadedImage extends ImagePixels {
    fileName: string;
    fileSize: number;
}
