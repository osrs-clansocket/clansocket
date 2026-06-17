import type { FrontFace } from "./triangulate.js";

export interface ExtrudedMesh {
    positions: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    groupBoundaries: {
        // Index buffer offsets where each region ENDS. Used by voxlab to create
        // geometry groups for the two-material split (front+back use flat-shaded
        // material, sides use smooth-shaded material).
        frontIndexEnd: number;
        backIndexEnd: number;
        sideIndexEnd: number;
    };
}

interface RingTopology {
    start: number;
    end: number;
}

export function extrudeMesh(front: FrontFace, depth: number, backFace: boolean): ExtrudedMesh {
    const halfDepth = depth / 2;
    const frontVertCount = front.positions.length / 2;

    if (!backFace || depth <= 0) {
        const positions = buildPlanePositions(front.positions, halfDepth);
        const normals = buildConstantNormals(frontVertCount, 0, 0, 1);
        return {
            positions,
            indices: front.indices.slice(),
            normals,
            groupBoundaries: {
                frontIndexEnd: front.indices.length,
                backIndexEnd: front.indices.length,
                sideIndexEnd: front.indices.length,
            },
        };
    }

    const positionsFront = buildPlanePositions(front.positions, halfDepth);
    const positionsBack = buildPlanePositions(front.positions, -halfDepth);
    const frontNormals = buildConstantNormals(frontVertCount, 0, 0, 1);
    const backNormals = buildConstantNormals(frontVertCount, 0, 0, -1);

    // Side-vertex duplicates of every contour vertex: one copy at +halfDepth
    // (sideFront), one at -halfDepth (sideBack). They have the SAME XY as their
    // front/back counterparts but live at separate indices so the side wall
    // can hold its own outward normals without contaminating front/back's
    // pure +Z / -Z normals.
    const sidePositions = new Float32Array(frontVertCount * 2 * 3);
    const sideNormals = new Float32Array(frontVertCount * 2 * 3);
    for (let i = 0; i < frontVertCount; i++) {
        const x = front.positions[i * 2];
        const y = front.positions[i * 2 + 1];
        sidePositions[i * 3] = x;
        sidePositions[i * 3 + 1] = y;
        sidePositions[i * 3 + 2] = halfDepth;
        sidePositions[(frontVertCount + i) * 3] = x;
        sidePositions[(frontVertCount + i) * 3 + 1] = y;
        sidePositions[(frontVertCount + i) * 3 + 2] = -halfDepth;
    }
    computeSideNormals(front, sideNormals, frontVertCount);

    const sideFrontBase = frontVertCount * 2;
    const sideBackBase = sideFrontBase + frontVertCount;
    const sideIndices = buildSideIndices(front, sideFrontBase, sideBackBase);

    const positions = new Float32Array((frontVertCount * 2 + frontVertCount * 2) * 3);
    positions.set(positionsFront, 0);
    positions.set(positionsBack, frontVertCount * 3);
    positions.set(sidePositions, frontVertCount * 6);

    const normals = new Float32Array(positions.length);
    normals.set(frontNormals, 0);
    normals.set(backNormals, frontVertCount * 3);
    normals.set(sideNormals, frontVertCount * 6);

    const frontIndices = front.indices.slice();
    const backIndices = buildBackIndices(front.indices, frontVertCount);

    const indices = new Uint32Array(frontIndices.length + backIndices.length + sideIndices.length);
    indices.set(frontIndices, 0);
    indices.set(backIndices, frontIndices.length);
    indices.set(sideIndices, frontIndices.length + backIndices.length);

    return {
        positions,
        indices,
        normals,
        groupBoundaries: {
            frontIndexEnd: frontIndices.length,
            backIndexEnd: frontIndices.length + backIndices.length,
            sideIndexEnd: frontIndices.length + backIndices.length + sideIndices.length,
        },
    };
}

function buildPlanePositions(positions2D: Float32Array, z: number): Float32Array {
    const count = positions2D.length / 2;
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        out[i * 3] = positions2D[i * 2];
        out[i * 3 + 1] = positions2D[i * 2 + 1];
        out[i * 3 + 2] = z;
    }
    return out;
}

function buildConstantNormals(count: number, x: number, y: number, z: number): Float32Array {
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        out[i * 3] = x;
        out[i * 3 + 1] = y;
        out[i * 3 + 2] = z;
    }
    return out;
}

function buildBackIndices(frontIndices: Uint32Array, offset: number): Uint32Array {
    const out = new Uint32Array(frontIndices.length);
    for (let i = 0; i < frontIndices.length; i += 3) {
        out[i] = frontIndices[i] + offset;
        out[i + 1] = frontIndices[i + 2] + offset;
        out[i + 2] = frontIndices[i + 1] + offset;
    }
    return out;
}

function buildSideIndices(front: FrontFace, sideFrontBase: number, sideBackBase: number): Uint32Array {
    const sides: number[] = [];
    for (let p = 0; p < front.polygonStarts.length; p++) {
        const start = front.polygonStarts[p];
        const end = front.polygonEnds[p];
        const ringSize = end - start;
        if (ringSize < 3) {
            continue;
        }
        for (let i = 0; i < ringSize; i++) {
            const localA = i;
            const localB = (i + 1) % ringSize;
            const a = sideFrontBase + start + localA;
            const b = sideFrontBase + start + localB;
            const aBack = sideBackBase + start + localA;
            const bBack = sideBackBase + start + localB;
            sides.push(a, b, bBack);
            sides.push(a, bBack, aBack);
        }
    }
    return Uint32Array.from(sides);
}

function computeSideNormals(front: FrontFace, sideNormals: Float32Array, frontVertCount: number): void {
    const rings: RingTopology[] = [];
    for (let p = 0; p < front.polygonStarts.length; p++) {
        rings.push({ start: front.polygonStarts[p], end: front.polygonEnds[p] });
    }
    for (const ring of rings) {
        const ringSize = ring.end - ring.start;
        if (ringSize < 3) {
            continue;
        }
        const sign = determineRingSign(front.positions, ring);
        for (let i = 0; i < ringSize; i++) {
            const prevLocal = (i - 1 + ringSize) % ringSize;
            const nextLocal = (i + 1) % ringSize;
            const vIdx = ring.start + i;
            const prevIdx = ring.start + prevLocal;
            const nextIdx = ring.start + nextLocal;
            const vx = front.positions[vIdx * 2];
            const vy = front.positions[vIdx * 2 + 1];
            const px = front.positions[prevIdx * 2];
            const py = front.positions[prevIdx * 2 + 1];
            const qx = front.positions[nextIdx * 2];
            const qy = front.positions[nextIdx * 2 + 1];
            let inX = vx - px;
            let inY = vy - py;
            const inLen = Math.sqrt(inX * inX + inY * inY);
            if (inLen > 0) {
                inX /= inLen;
                inY /= inLen;
            }
            let outX = qx - vx;
            let outY = qy - vy;
            const outLen = Math.sqrt(outX * outX + outY * outY);
            if (outLen > 0) {
                outX /= outLen;
                outY /= outLen;
            }
            let tx = inX + outX;
            let ty = inY + outY;
            const tlen = Math.sqrt(tx * tx + ty * ty);
            if (tlen > 0) {
                tx /= tlen;
                ty /= tlen;
            }
            const outwardX = sign * ty;
            const outwardY = -sign * tx;
            const sideFrontIdx = vIdx * 3;
            const sideBackIdx = (frontVertCount + vIdx) * 3;
            sideNormals[sideFrontIdx] = outwardX;
            sideNormals[sideFrontIdx + 1] = outwardY;
            sideNormals[sideFrontIdx + 2] = 0;
            sideNormals[sideBackIdx] = outwardX;
            sideNormals[sideBackIdx + 1] = outwardY;
            sideNormals[sideBackIdx + 2] = 0;
        }
    }
}

function determineRingSign(positions: Float32Array, ring: RingTopology): number {
    let area = 0;
    const ringSize = ring.end - ring.start;
    for (let i = 0; i < ringSize; i++) {
        const aIdx = ring.start + i;
        const bIdx = ring.start + ((i + 1) % ringSize);
        const ax = positions[aIdx * 2];
        const ay = positions[aIdx * 2 + 1];
        const bx = positions[bIdx * 2];
        const by = positions[bIdx * 2 + 1];
        area += ax * by - bx * ay;
    }
    return area >= 0 ? 1 : -1;
}
