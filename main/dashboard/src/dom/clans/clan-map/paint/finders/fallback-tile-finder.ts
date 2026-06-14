import { MAX_ZOOM, MIN_ZOOM } from "../../../../../shared/constants/clan-map-constants.js";
import { tileUrl } from "../formatters/tile-url-formatter.js";

const TILE_SOURCE_PX = 256;
const QUAD_COUNT = 4;

export interface AncestorDraw {
    img: HTMLImageElement;
    srcX: number;
    srcY: number;
    srcSize: number;
}

export interface ChildDraw {
    img: HTMLImageElement;
    quad: number;
}

export function findAncestorDraw(
    plane: number,
    zoom: number,
    tx: number,
    ty: number,
    cache: Map<string, HTMLImageElement>,
    maxLevels: number,
): AncestorDraw | null {
    for (let scaleDiff = 1; scaleDiff <= maxLevels; scaleDiff++) {
        const ancZoom = zoom - scaleDiff;
        if (ancZoom < MIN_ZOOM) return null;
        const ancTx = tx >> scaleDiff;
        const ancTy = ty >> scaleDiff;
        const url = tileUrl(plane, ancZoom, ancTx, ancTy);
        const img = cache.get(url);
        if (img === undefined) continue;
        if (!img.complete || img.naturalWidth === 0) continue;
        const mask = (1 << scaleDiff) - 1;
        const localX = tx & mask;
        const localY = ty & mask;
        const srcSize = TILE_SOURCE_PX >> scaleDiff;
        return {
            img,
            srcX: localX * srcSize,
            srcY: localY * srcSize,
            srcSize,
        };
    }
    return null;
}

export function findChildDraws(
    plane: number,
    zoom: number,
    tx: number,
    ty: number,
    cache: Map<string, HTMLImageElement>,
): ChildDraw[] {
    if (zoom + 1 > MAX_ZOOM) return [];
    const draws: ChildDraw[] = [];
    for (let q = 0; q < QUAD_COUNT; q++) {
        const childTx = 2 * tx + (q & 1);
        const childTy = 2 * ty + (q >> 1);
        const url = tileUrl(plane, zoom + 1, childTx, childTy);
        const img = cache.get(url);
        if (img !== undefined && img.complete && img.naturalWidth > 0) {
            draws.push({ img, quad: q });
        }
    }
    return draws;
}
