import { getStaticDb, STATIC_DB_NAMES } from "../database/index.js";

const META_QUERY =
    "SELECT width, height, tiles_per_region, pixels_per_tile, region_px," +
    " origin_world_x, top_world_y, region_count FROM map_meta WHERE id = 1";
const PLANES_QUERY = "SELECT plane, image, tiles_dir, region_count FROM map_planes ORDER BY plane ASC";
const REGIONS_QUERY =
    "SELECT region_id, rx, ry, base_x, base_y, px, py, pw, ph FROM map_regions ORDER BY region_id ASC";

export interface MapMeta {
    width: number;
    height: number;
    tiles_per_region: number;
    pixels_per_tile: number;
    region_px: number;
    origin_world_x: number;
    top_world_y: number;
    region_count: number;
}

export interface MapPlane {
    plane: number;
    image: string;
    tiles_dir: string | null;
    region_count: number;
}

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

export function getMapMeta(): MapMeta | null {
    return (getStaticDb(STATIC_DB_NAMES.WORLD_MAP).prepare(META_QUERY).get() as MapMeta | undefined) ?? null;
}

export function listMapPlanes(): MapPlane[] {
    return getStaticDb(STATIC_DB_NAMES.WORLD_MAP).prepare(PLANES_QUERY).all() as MapPlane[];
}

export function listMapRegions(): MapRegion[] {
    return getStaticDb(STATIC_DB_NAMES.WORLD_MAP).prepare(REGIONS_QUERY).all() as MapRegion[];
}
