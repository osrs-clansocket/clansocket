import type { PackageLogger } from "../raster-to-mesh/logger.js";
import type { ImageDataLike, MeshBounds, MeshData, MeshMetadata, Point2D, Polygon } from "../raster-to-mesh/types.js";

export type VectorSource = { kind: "svg-text"; svgText: string } | { kind: "svg-path"; pathData: string };

export interface VectorToMeshOptions {
    source: VectorSource;
    bezierTolerance?: number;
    extrusionDepth?: number;
    smoothingPasses?: number;
    taubinRounds?: number;
    taubinLambda?: number;
    taubinMu?: number;
    cornerAngleDegrees?: number;
    vertexColor?: readonly [number, number, number];
    backFace?: boolean;
    normalize?: boolean;
    logger?: PackageLogger;
}

export type { ImageDataLike, MeshBounds, MeshData, MeshMetadata, Point2D, Polygon };
