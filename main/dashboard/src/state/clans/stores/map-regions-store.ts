import { createFetchStore } from "../../stores/lazy-store.js";
import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";

export interface MapRegion {
    region_id: number;
    rx: number;
    ry: number;
    base_x: number;
    base_y: number;
    px: number;
    py: number;
    pw: number;
    ph: number;
}

export type MapRegionsState = readonly MapRegion[];

interface RegionsResponse {
    regions: MapRegion[];
}

const INITIAL: MapRegionsState = [];

async function loadRegions(): Promise<MapRegionsState> {
    const res = await sameOriginFetch("/api/map/regions?v=2");
    if (!res.ok) return INITIAL;
    const body = (await res.json()) as RegionsResponse;
    return body.regions;
}

function noSubscribe(): () => void {
    return () => {};
}

export const mapRegionsStore = createFetchStore<MapRegionsState, "regions$">({
    key: "regions$",
    initial: INITIAL,
    load: loadRegions,
    subscribe: noSubscribe,
});
