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

export function luminanceMapper(image: ImageData, invert: boolean): ImageData {
    const { width, height, data } = image;
    const out = new ImageData(width, height);
    for (let i = 0; i < data.length; i += RGBA_STRIDE_PBR) {
        const lum = LUM_R * data[i] + LUM_G * data[i + POSITION_X_OFFSET] + LUM_B * data[i + POSITION_Y_OFFSET];
        const value = invert ? BYTE_MAX_PBR - lum : lum;
        const clamped = Math.max(0, Math.min(BYTE_MAX_PBR, Math.round(value)));
        out.data[i] = clamped;
        out.data[i + POSITION_X_OFFSET] = clamped;
        out.data[i + POSITION_Y_OFFSET] = clamped;
        out.data[i + POSITION_Z_OFFSET] = BYTE_MAX_PBR;
    }
    return out;
}
