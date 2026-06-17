import { buildPolygons, chaikinSmooth, flattenBetweenCorners, taubinSmooth } from "../raster-to-mesh/contour.js";
import { buildMeshData } from "../raster-to-mesh/export.js";
import { extrudeMesh } from "../raster-to-mesh/extrude.js";
import { DEFAULT_LOGGER } from "../raster-to-mesh/logger.js";
import { triangulatePolygons } from "../raster-to-mesh/triangulate.js";
import type { Point2D } from "../raster-to-mesh/types.js";
import { VECTOR_VOXEL_RESOLUTION_TELEMETRY } from "./constants/defaults.js";
import { parseSvgDoc } from "./parse-svg-doc.js";
import { pathToRings } from "./path-to-rings.js";
import { resolveOptions, type ResolvedOptions } from "./resolve-options.js";
import type { MeshData, VectorSource, VectorToMeshOptions } from "./types.js";

export function vectorToMesh(options: VectorToMeshOptions): MeshData {
    validateInput(options);
    const resolved = resolveOptions(options);
    const logger = options.logger ?? DEFAULT_LOGGER;
    logger.debug("vectorToMesh: starting pipeline", { context: { source: options.source.kind } });

    const rings = sourceToRings(options.source, resolved.bezierTolerance);
    logger.debug(`rings: ${rings.length}`);
    const smoothed = applyOptionalSmoothing(rings, resolved);
    const polygons = buildPolygons(smoothed);
    logger.debug(`polygons: ${polygons.length}`);
    if (polygons.length === 0) throw new Error("vectorToMesh: empty polygon set");

    const front = triangulatePolygons(polygons);
    logger.debug(`triangulated: ${front.indices.length / 3} triangles`);
    const meshData = buildExtrudedMesh(front, resolved);
    logger.info("vectorToMesh: complete", { context: { vertices: meshData.metadata.vertexCount } });
    return meshData;
}

function sourceToRings(source: VectorSource, tolerance: number): Point2D[][] {
    if (source.kind === "svg-path") return pathToRings(source.pathData, tolerance);
    const paths = parseSvgDoc(source.svgText);
    const out: Point2D[][] = [];
    for (const d of paths) for (const ring of pathToRings(d, tolerance)) out.push(ring);
    return out;
}

function applyOptionalSmoothing(rings: Point2D[][], r: ResolvedOptions): Point2D[][] {
    if (r.smoothingPasses === 0 && r.taubinRounds === 0 && r.cornerAngleDegrees === 0) return rings;
    let result = rings;
    if (r.smoothingPasses > 0) result = result.map((ring) => chaikinSmooth(ring, r.smoothingPasses));
    if (r.cornerAngleDegrees > 0) result = result.map((ring) => flattenBetweenCorners(ring, r.cornerAngleDegrees));
    if (r.taubinRounds > 0)
        result = result.map((ring) => taubinSmooth(ring, r.taubinRounds, r.taubinLambda, r.taubinMu));
    return result;
}

function buildExtrudedMesh(front: ReturnType<typeof triangulatePolygons>, r: ResolvedOptions): MeshData {
    const scale2D = compute2DScale(front.positions);
    const scaledDepth = r.extrusionDepth * scale2D;
    const extruded = extrudeMesh(front, scaledDepth, r.backFace);
    return buildMeshData(extruded, {
        color: r.vertexColor,
        voxelResolution: VECTOR_VOXEL_RESOLUTION_TELEMETRY,
        extrusionDepth: r.extrusionDepth,
        normalize: r.normalize,
    });
}

function compute2DScale(positions2D: Float32Array): number {
    if (positions2D.length === 0) return 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < positions2D.length; i += 2) {
        const x = positions2D[i];
        const y = positions2D[i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return Math.max(maxX - minX, maxY - minY, 1);
}

function validateInput(options: VectorToMeshOptions): void {
    if (!options || typeof options !== "object") throw new Error("vectorToMesh: options object required");
    const src = options.source;
    if (!src || typeof src !== "object") throw new Error("vectorToMesh: source required");
    if (src.kind === "svg-text" && typeof src.svgText !== "string") {
        throw new Error("vectorToMesh: svg-text source must include svgText string");
    }
    if (src.kind === "svg-path" && typeof src.pathData !== "string") {
        throw new Error("vectorToMesh: svg-path source must include pathData string");
    }
}
