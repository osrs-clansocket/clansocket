export type Payload = any;

export const BUCKET_MS = 60_000;

export interface SpatialColumns {
    world: number | null;
    x: number | null;
    y: number | null;
    plane: number | null;
    region_id: number | null;
    region_name: string | null;
    area: string | null;
}

export const EMPTY_WHERE: SpatialColumns = Object.freeze({
    world: null,
    x: null,
    y: null,
    plane: null,
    region_id: null,
    region_name: null,
    area: null,
}) as SpatialColumns;

export function extractWhere(p: Payload): SpatialColumns {
    const w = p?.where;
    if (!w || typeof w !== "object") return EMPTY_WHERE;
    return {
        world: typeof w.world === "number" ? w.world : null,
        x: typeof w.x === "number" ? w.x : null,
        y: typeof w.y === "number" ? w.y : null,
        plane: typeof w.plane === "number" ? w.plane : null,
        region_id: typeof w.regionId === "number" ? w.regionId : null,
        region_name: typeof w.regionName === "string" ? w.regionName : null,
        area: typeof w.area === "string" ? w.area : null,
    };
}

function toTitleCase(s: string): string {
    if (s.length === 0) return s;
    const lower = s.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.substring(1);
}

export function deriveDiaryId(region: string, tier: string): string {
    return `${region.toUpperCase()}_${tier.toUpperCase()}`;
}

export function deriveDiaryName(region: string, tier: string): string {
    return `${toTitleCase(region)} ${toTitleCase(tier)} Diary`;
}
