import type { PositionRow, PositionsMapMeta } from "../../../../../state/clans/stores/positions-store.js";
import type { CompositeView } from "../../../../../shared/types/clan-map-view-types.js";

export function worldXYToImagePx(x: number, y: number, meta: PositionsMapMeta): { ix: number; iy: number } {
    const ix = (x - meta.origin_world_x) * meta.pixels_per_tile;
    const iy = (meta.top_world_y - y) * meta.pixels_per_tile;
    return { ix, iy };
}

export function worldToImagePx(row: PositionRow, meta: PositionsMapMeta): { ix: number; iy: number } {
    return worldXYToImagePx(row.location_x, row.location_y, meta);
}

export function canvasToAtlas(view: CompositeView, canvasX: number, canvasY: number): { ax: number; ay: number } {
    return {
        ax: (canvasX - view.offsetX) / view.scale,
        ay: (canvasY - view.offsetY) / view.scale,
    };
}
