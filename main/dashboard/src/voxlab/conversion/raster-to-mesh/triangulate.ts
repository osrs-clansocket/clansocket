import earcut from "earcut";
import type { Polygon } from "./types.js";

export interface FrontFace {
    positions: Float32Array;
    indices: Uint32Array;
    polygonStarts: number[];
    polygonEnds: number[];
}

export function triangulatePolygons(polygons: Polygon[]): FrontFace {
    const positions: number[] = [];
    const indices: number[] = [];
    const polygonStarts: number[] = [];
    const polygonEnds: number[] = [];
    let vertexOffset = 0;
    for (const polygon of polygons) {
        const polyStart = vertexOffset;
        const { flat, holeIndices, count } = flattenPolygon(polygon);
        const tri = earcut(flat, holeIndices, 2);
        for (let i = 0; i < count; i++) {
            positions.push(flat[i * 2], flat[i * 2 + 1]);
        }
        for (const localIdx of tri) {
            indices.push(polyStart + localIdx);
        }
        // Push ONE span per ring (outer + each hole). The extruder iterates
        // over these spans to build side walls — if outer + holes are squashed
        // into a single span the side wall connects outer-ring edges to
        // hole-ring edges across the cavity, producing diagonal-pane artifacts.
        const outerCount = polygon.outer.length;
        polygonStarts.push(polyStart);
        polygonEnds.push(polyStart + outerCount);
        let holeOffset = outerCount;
        for (const hole of polygon.holes) {
            polygonStarts.push(polyStart + holeOffset);
            polygonEnds.push(polyStart + holeOffset + hole.length);
            holeOffset += hole.length;
        }
        vertexOffset += count;
    }
    return {
        positions: Float32Array.from(positions),
        indices: Uint32Array.from(indices),
        polygonStarts,
        polygonEnds,
    };
}

function flattenPolygon(polygon: Polygon): { flat: number[]; holeIndices: number[]; count: number } {
    const flat: number[] = [];
    for (const p of polygon.outer) {
        flat.push(p.x, p.y);
    }
    const holeIndices: number[] = [];
    for (const hole of polygon.holes) {
        holeIndices.push(flat.length / 2);
        for (const p of hole) {
            flat.push(p.x, p.y);
        }
    }
    return { flat, holeIndices, count: flat.length / 2 };
}
