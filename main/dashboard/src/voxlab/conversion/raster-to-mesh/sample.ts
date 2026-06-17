import type { ImageDataLike } from "./types.js";

const RGBA_STRIDE = 4;
const RGB_STRIDE = 3;
const BYTE_MAX = 255;

export interface SampleGrid {
    alpha: Float32Array;
    rgb: Float32Array;
    width: number;
    height: number;
}

export function sampleImage(image: ImageDataLike): SampleGrid {
    const { data, width, height } = image;
    const total = width * height;
    if (data.length !== total * RGBA_STRIDE) {
        throw new Error(
            `sampleImage: data length ${data.length} does not match width*height*4 (${total * RGBA_STRIDE})`,
        );
    }
    const alpha = new Float32Array(total);
    const rgb = new Float32Array(total * RGB_STRIDE);
    for (let i = 0; i < total; i++) {
        const base = i * RGBA_STRIDE;
        const out = i * RGB_STRIDE;
        rgb[out] = data[base] / BYTE_MAX;
        rgb[out + 1] = data[base + 1] / BYTE_MAX;
        rgb[out + 2] = data[base + 2] / BYTE_MAX;
        alpha[i] = data[base + 3] / BYTE_MAX;
    }
    return { alpha, rgb, width, height };
}
