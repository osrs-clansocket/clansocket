import {
    BYTE_MAX_PBR,
    LUM_B,
    LUM_G,
    LUM_R,
    POSITION_X_OFFSET,
    POSITION_Y_OFFSET,
    POSITION_Z_OFFSET,
    RGBA_STRIDE_PBR,
} from "../../shared/constants/voxlab/pbr-generation-constants.js";

export function localContrastMapper(image: ImageData, radius: number): ImageData {
    const { width, height, data } = image;
    const out = new ImageData(width, height);
    const r = Math.max(1, Math.floor(radius));
    const lum = new Float32Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += RGBA_STRIDE_PBR, j++) {
        lum[j] =
            (LUM_R * data[i] + LUM_G * data[i + POSITION_X_OFFSET] + LUM_B * data[i + POSITION_Y_OFFSET]) /
            BYTE_MAX_PBR;
    }
    const lastX = width - 1;
    const lastY = height - 1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const nx = Math.max(0, Math.min(lastX, x + dx));
                    const ny = Math.max(0, Math.min(lastY, y + dy));
                    sum += lum[ny * width + nx];
                    count++;
                }
            }
            const avg = sum / count;
            const centerLum = lum[y * width + x];
            const ratio = avg === 0 ? 1 : centerLum / avg;
            const aoValue = Math.max(0, Math.min(BYTE_MAX_PBR, Math.round(ratio * BYTE_MAX_PBR)));
            const idx = (y * width + x) * RGBA_STRIDE_PBR;
            out.data[idx] = aoValue;
            out.data[idx + POSITION_X_OFFSET] = aoValue;
            out.data[idx + POSITION_Y_OFFSET] = aoValue;
            out.data[idx + POSITION_Z_OFFSET] = BYTE_MAX_PBR;
        }
    }
    return out;
}
