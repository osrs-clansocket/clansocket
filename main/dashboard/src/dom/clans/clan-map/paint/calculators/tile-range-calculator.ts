import type { AtlasBox } from "../../../../../shared/types/clan-map-view-types.js";
import { MAX_ZOOM, REGION_PX_DEFAULT } from "../../../../../shared/constants/clan-map-constants.js";

export interface TileRange {
    txMin: number;
    tyMin: number;
    txMax: number;
    tyMax: number;
    tileWorldSize: number;
}

export function computeTileRange(viewport: AtlasBox, zoom: number): TileRange {
    const regionsPerTile = 1 << (MAX_ZOOM - zoom);
    const tileWorldSize = REGION_PX_DEFAULT * regionsPerTile;
    const txMin = Math.floor(viewport.x / tileWorldSize);
    const tyMin = Math.floor(viewport.y / tileWorldSize);
    const txMax = Math.ceil((viewport.x + viewport.w) / tileWorldSize) - 1;
    const tyMax = Math.ceil((viewport.y + viewport.h) / tileWorldSize) - 1;
    return { txMin, tyMin, txMax, tyMax, tileWorldSize };
}
