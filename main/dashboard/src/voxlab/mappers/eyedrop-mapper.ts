import { Triangle, Vector3, type BufferAttribute, type Intersection } from "three";

const BYTE_MAX_EYEDROP = 255;

const scratchBary = new Vector3();
const scratchA = new Vector3();
const scratchB = new Vector3();
const scratchC = new Vector3();

export function eyedropMapper(
    intersection: Intersection,
    positions: BufferAttribute,
    colors: BufferAttribute,
): string | null {
    if (!intersection.face) {
        return null;
    }
    const { a, b, c } = intersection.face;

    scratchA.fromBufferAttribute(positions, a);
    scratchB.fromBufferAttribute(positions, b);
    scratchC.fromBufferAttribute(positions, c);

    Triangle.getBarycoord(intersection.point, scratchA, scratchB, scratchC, scratchBary);

    const ar = colors.getX(a);
    const ag = colors.getY(a);
    const aB = colors.getZ(a);
    const br = colors.getX(b);
    const bg = colors.getY(b);
    const bB = colors.getZ(b);
    const cr = colors.getX(c);
    const cg = colors.getY(c);
    const cB = colors.getZ(c);

    const r = ar * scratchBary.x + br * scratchBary.y + cr * scratchBary.z;
    const g = ag * scratchBary.x + bg * scratchBary.y + cg * scratchBary.z;
    const bChannel = aB * scratchBary.x + bB * scratchBary.y + cB * scratchBary.z;

    return rgbToHex(r, g, bChannel);
}

function rgbToHex(r: number, g: number, b: number): string {
    const rHex = clampByte(r).toString(16).padStart(2, "0");
    const gHex = clampByte(g).toString(16).padStart(2, "0");
    const bHex = clampByte(b).toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`;
}

function clampByte(channel: number): number {
    return Math.max(0, Math.min(BYTE_MAX_EYEDROP, Math.round(channel * BYTE_MAX_EYEDROP)));
}
