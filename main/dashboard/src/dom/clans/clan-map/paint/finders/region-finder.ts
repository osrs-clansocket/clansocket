import type { MapRegion } from "../../../../../state/clans/stores/map-regions-store.js";

export function regionAtAtlasPoint(regions: readonly MapRegion[], ax: number, ay: number): MapRegion | null {
    for (const r of regions) {
        if (ax >= r.px && ax < r.px + r.pw && ay >= r.py && ay < r.py + r.ph) return r;
    }
    return null;
}
