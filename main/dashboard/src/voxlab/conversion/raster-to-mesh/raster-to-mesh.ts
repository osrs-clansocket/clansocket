import { buildPolygons, chainSegments, chaikinSmooth, flattenBetweenCorners, taubinSmooth } from "./contour.js";
import {
    DEFAULT_ALPHA_THRESHOLD,
    DEFAULT_BACK_FACE,
    DEFAULT_CORNER_ANGLE_DEGREES,
    DEFAULT_EXTRUSION_DEPTH,
    DEFAULT_NORMALIZE,
    DEFAULT_SMOOTHING_PASSES,
    DEFAULT_TAUBIN_LAMBDA,
    DEFAULT_TAUBIN_MU,
    DEFAULT_TAUBIN_ROUNDS,
    DEFAULT_VERTEX_COLOR,
    DEFAULT_VOXEL_RESOLUTION,
    MAX_CORNER_ANGLE_DEGREES,
    MAX_EXTRUSION_DEPTH,
    MAX_SMOOTHING_PASSES,
    MAX_TAUBIN_LAMBDA,
    MAX_TAUBIN_MU,
    MAX_TAUBIN_ROUNDS,
    MAX_VOXEL_RESOLUTION,
    MIN_CORNER_ANGLE_DEGREES,
    MIN_EXTRUSION_DEPTH,
    MIN_SMOOTHING_PASSES,
    MIN_TAUBIN_LAMBDA,
    MIN_TAUBIN_MU,
    MIN_TAUBIN_ROUNDS,
    MIN_VOXEL_RESOLUTION,
} from "./constants/defaults.js";
import { buildMeshData } from "./export.js";
import { extrudeMesh } from "./extrude.js";
import { DEFAULT_LOGGER } from "./logger.js";
import { marchingSquares } from "./marching-squares.js";
import type { Polygon } from "./types.js";
import { sampleImage } from "./sample.js";
import { triangulatePolygons } from "./triangulate.js";
import { voxelize } from "./voxelize.js";
import type { MeshData, RasterToMeshOptions } from "./types.js";

interface Resolved {
    voxelResolution: number;
    extrusionDepth: number;
    smoothingPasses: number;
    taubinRounds: number;
    taubinLambda: number;
    taubinMu: number;
    cornerAngleDegrees: number;
    alphaThreshold: number;
    vertexColor: readonly [number, number, number];
    backFace: boolean;
    normalize: boolean;
}

export function rasterToMesh(options: RasterToMeshOptions): MeshData {
    validateInput(options);
    const resolved = resolveOptions(options);
    const logger = options.logger ?? DEFAULT_LOGGER;
    logger.debug("rasterToMesh: starting pipeline", { context: { resolution: resolved.voxelResolution } });

    const sample = sampleImage(options.imageData);
    const alphaStats = describeAlpha(sample.alpha);
    logger.debug(
        `sampled ${sample.width}x${sample.height} alpha min=${alphaStats.min.toFixed(3)} max=${alphaStats.max.toFixed(3)} mean=${alphaStats.mean.toFixed(3)}`,
    );

    const voxel = voxelize(sample, resolved.voxelResolution, resolved.alphaThreshold);
    let maskOn = 0;
    for (let i = 0; i < voxel.mask.length; i++) {
        if (voxel.mask[i]) {
            maskOn++;
        }
    }
    logger.debug(`voxelized resolution=${voxel.resolution} mask-on=${maskOn}/${voxel.mask.length}`);

    const segments = marchingSquares(voxel, resolved.alphaThreshold);
    logger.debug(`marching squares: ${segments.length} edge segments`);

    const rings = chainSegments(segments);
    logger.debug(
        `chained: ${rings.length} rings (sizes: ${rings
            .slice(0, 5)
            .map((r) => r.length)
            .join(",")})`,
    );
    const chaikin = rings.map((ring) => chaikinSmooth(ring, resolved.smoothingPasses));
    const flattened = chaikin.map((ring) => flattenBetweenCorners(ring, resolved.cornerAngleDegrees));
    const smoothed = flattened.map((ring) =>
        taubinSmooth(ring, resolved.taubinRounds, resolved.taubinLambda, resolved.taubinMu),
    );
    logger.debug(
        `contour smoothing: chaikin=${resolved.smoothingPasses} taubin=${resolved.taubinRounds} λ=${resolved.taubinLambda} μ=${resolved.taubinMu} cornerAngle=${resolved.cornerAngleDegrees}`,
    );
    const polygons = buildPolygons(smoothed);
    logger.debug(`polygons: ${polygons.length}`);

    const front = triangulatePolygons(polygons);
    logger.debug(`triangulated: ${front.positions.length / 2} vertices, ${front.indices.length / 3} triangles`);

    const meshData = buildExtrudedMesh(front, polygons, resolved, voxel);
    logger.info("rasterToMesh: complete", {
        context: { vertices: meshData.metadata.vertexCount, triangles: meshData.metadata.triangleCount },
    });
    return meshData;
}

function buildExtrudedMesh(
    front: ReturnType<typeof triangulatePolygons>,
    polygons: Polygon[],
    resolved: Resolved,
    voxel: import("./voxelize.js").VoxelGrid,
): MeshData {
    const scale2D = compute2DScale(front.positions);
    const scaledDepth = resolved.extrusionDepth * scale2D;
    const extruded = extrudeMesh(front, scaledDepth, resolved.backFace);
    void polygons;
    return buildMeshData(extruded, {
        color: resolved.vertexColor,
        voxelResolution: resolved.voxelResolution,
        extrusionDepth: resolved.extrusionDepth,
        normalize: resolved.normalize,
        voxel,
    });
}

function compute2DScale(positions2D: Float32Array): number {
    if (positions2D.length === 0) {
        return 1;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < positions2D.length; i += 2) {
        const x = positions2D[i];
        const y = positions2D[i + 1];
        if (x < minX) {
            minX = x;
        }
        if (y < minY) {
            minY = y;
        }
        if (x > maxX) {
            maxX = x;
        }
        if (y > maxY) {
            maxY = y;
        }
    }
    return Math.max(maxX - minX, maxY - minY, 1);
}

function validateInput(options: RasterToMeshOptions): void {
    if (!options || typeof options !== "object") {
        throw new Error("rasterToMesh: options object is required");
    }
    validateImageData(options.imageData);
}

function validateImageData(img: RasterToMeshOptions["imageData"] | undefined): void {
    if (!img || typeof img !== "object") {
        throw new Error("rasterToMesh: options.imageData is required");
    }
    if (!Number.isFinite(img.width) || img.width <= 0 || !Number.isFinite(img.height) || img.height <= 0) {
        throw new Error(
            `rasterToMesh: imageData has invalid dimensions ${img.width}x${img.height} (must be positive finite)`,
        );
    }
    const expectedLength = img.width * img.height * 4;
    if (!img.data || img.data.length !== expectedLength) {
        throw new Error(
            `rasterToMesh: imageData.data length ${img.data?.length ?? 0} does not match width*height*4 (${expectedLength})`,
        );
    }
}

interface NumericBounds {
    fallback: number;
    min: number;
    max: number;
}

const BOUNDS_VOXEL: NumericBounds = {
    fallback: DEFAULT_VOXEL_RESOLUTION,
    min: MIN_VOXEL_RESOLUTION,
    max: MAX_VOXEL_RESOLUTION,
};
const BOUNDS_DEPTH: NumericBounds = {
    fallback: DEFAULT_EXTRUSION_DEPTH,
    min: MIN_EXTRUSION_DEPTH,
    max: MAX_EXTRUSION_DEPTH,
};
const BOUNDS_SMOOTH: NumericBounds = {
    fallback: DEFAULT_SMOOTHING_PASSES,
    min: MIN_SMOOTHING_PASSES,
    max: MAX_SMOOTHING_PASSES,
};
const BOUNDS_TAUBIN: NumericBounds = {
    fallback: DEFAULT_TAUBIN_ROUNDS,
    min: MIN_TAUBIN_ROUNDS,
    max: MAX_TAUBIN_ROUNDS,
};
const BOUNDS_TAUBIN_LAMBDA: NumericBounds = {
    fallback: DEFAULT_TAUBIN_LAMBDA,
    min: MIN_TAUBIN_LAMBDA,
    max: MAX_TAUBIN_LAMBDA,
};
const BOUNDS_TAUBIN_MU: NumericBounds = {
    fallback: DEFAULT_TAUBIN_MU,
    min: MIN_TAUBIN_MU,
    max: MAX_TAUBIN_MU,
};
const BOUNDS_CORNER: NumericBounds = {
    fallback: DEFAULT_CORNER_ANGLE_DEGREES,
    min: MIN_CORNER_ANGLE_DEGREES,
    max: MAX_CORNER_ANGLE_DEGREES,
};
const BOUNDS_ALPHA: NumericBounds = {
    fallback: DEFAULT_ALPHA_THRESHOLD,
    min: 0,
    max: 1,
};

function resolveOptions(options: RasterToMeshOptions): Resolved {
    return {
        voxelResolution: clampInt(options.voxelResolution, BOUNDS_VOXEL),
        extrusionDepth: clamp(options.extrusionDepth, BOUNDS_DEPTH),
        smoothingPasses: clampInt(options.smoothingPasses, BOUNDS_SMOOTH),
        taubinRounds: clampInt(options.taubinRounds, BOUNDS_TAUBIN),
        taubinLambda: clamp(options.taubinLambda, BOUNDS_TAUBIN_LAMBDA),
        taubinMu: clamp(options.taubinMu, BOUNDS_TAUBIN_MU),
        cornerAngleDegrees: clamp(options.cornerAngleDegrees, BOUNDS_CORNER),
        alphaThreshold: clamp(options.alphaThreshold, BOUNDS_ALPHA),
        vertexColor: options.vertexColor ?? DEFAULT_VERTEX_COLOR,
        backFace: options.backFace ?? DEFAULT_BACK_FACE,
        normalize: options.normalize ?? DEFAULT_NORMALIZE,
    };
}

function clamp(value: number | undefined, bounds: NumericBounds): number {
    if (value === undefined || !Number.isFinite(value)) {
        return bounds.fallback;
    }
    return Math.max(bounds.min, Math.min(bounds.max, value));
}

function clampInt(value: number | undefined, bounds: NumericBounds): number {
    return Math.floor(clamp(value, bounds));
}

function describeAlpha(alpha: Float32Array): { min: number; max: number; mean: number } {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < alpha.length; i++) {
        const a = alpha[i];
        if (a < min) {
            min = a;
        }
        if (a > max) {
            max = a;
        }
        sum += a;
    }
    return { min, max, mean: sum / alpha.length };
}
