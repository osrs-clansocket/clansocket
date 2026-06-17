import {
    BYTE_MAX_PBR,
    DEFAULT_SOBEL_STRENGTH,
    LUM_B,
    LUM_G,
    LUM_R,
    NORMAL_ENCODE_BIAS,
    POSITION_X_OFFSET,
    POSITION_Y_OFFSET,
    POSITION_Z_OFFSET,
    RGBA_STRIDE_PBR,
    SAMPLE_NEIGHBOR_OFFSET,
} from "../../shared/constants/voxlab/pbr-generation-constants.js";

export function sobelMapper(image: ImageData, strengthOverride?: number): ImageData {
    const { width, height, data } = image;
    const out = new ImageData(width, height);
    const lum = computeLuminance(data, width, height);
    const lastX = width - 1;
    const lastY = height - 1;
    const strength = strengthOverride ?? DEFAULT_SOBEL_STRENGTH;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const xR = Math.min(lastX, x + SAMPLE_NEIGHBOR_OFFSET);
            const xL = Math.max(0, x - SAMPLE_NEIGHBOR_OFFSET);
            const yD = Math.min(lastY, y + SAMPLE_NEIGHBOR_OFFSET);
            const yU = Math.max(0, y - SAMPLE_NEIGHBOR_OFFSET);
            const dx = (lum[y * width + xR] - lum[y * width + xL]) / (1 + SAMPLE_NEIGHBOR_OFFSET);
            const dy = (lum[yD * width + x] - lum[yU * width + x]) / (1 + SAMPLE_NEIGHBOR_OFFSET);
            const nx = -dx * strength;
            const ny = -dy * strength;
            const nz = 1;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const idx = (y * width + x) * RGBA_STRIDE_PBR;
            out.data[idx] = Math.round(((nx / len) * NORMAL_ENCODE_BIAS + NORMAL_ENCODE_BIAS) * BYTE_MAX_PBR);
            out.data[idx + POSITION_X_OFFSET] = Math.round(
                ((ny / len) * NORMAL_ENCODE_BIAS + NORMAL_ENCODE_BIAS) * BYTE_MAX_PBR,
            );
            out.data[idx + POSITION_Y_OFFSET] = Math.round(
                ((nz / len) * NORMAL_ENCODE_BIAS + NORMAL_ENCODE_BIAS) * BYTE_MAX_PBR,
            );
            out.data[idx + POSITION_Z_OFFSET] = BYTE_MAX_PBR;
        }
    }
    return out;
}

function computeLuminance(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const lum = new Float32Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += RGBA_STRIDE_PBR, j++) {
        lum[j] =
            (LUM_R * data[i] + LUM_G * data[i + POSITION_X_OFFSET] + LUM_B * data[i + POSITION_Y_OFFSET]) /
            BYTE_MAX_PBR;
    }
    return lum;
}
