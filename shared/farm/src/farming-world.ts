import type { PatchImplementation } from "./types.ts";
import { TRANSMIT } from "./varbits.ts";

export interface PatchDef {
    readonly varbit: number;
    readonly impl: PatchImplementation;
}

type Bounds = (x: number, y: number, plane: number) => boolean;

export interface FarmingRegion {
    readonly name: string;
    readonly regionId: number;
    readonly patches: readonly PatchDef[];
    readonly bounds: Bounds;
}

interface RegionDef {
    readonly name: string;
    readonly regionId: number;
    readonly patches: readonly PatchDef[];
    readonly extras?: readonly number[];
    readonly bounds?: Bounds;
}

// Some region IDs host more than one farming region (e.g. Falador allotments and
// Port Sarim's spirit tree both report from region 12083). These predicates
// partition by player coordinates so a transmit varbit resolves to one patch.
const catherbyMainBounds: Bounds = (x, y, plane) => {
    if (x >= 2816 && y < 3456) {
        return x < 2840 && y >= 3440 && plane === 0;
    }
    return true;
};
const catherbyFruitBounds: Bounds = (x, y, plane) => x >= 2840 || y < 3440 || plane === 1;
const faladorBounds: Bounds = (_x, y, _plane) => y >= 3272;
const portSarimBounds: Bounds = (_x, y, _plane) => y < 3272;
const fossilIslandBounds: Bounds = (x, y, plane) => {
    if (x === 3753 && y >= 3868 && y <= 3870) {
        return false;
    }
    if ((x === 3729 || x === 3728 || x === 3747 || x === 3746) && y <= 3832 && y >= 3830) {
        return false;
    }
    return plane === 0;
};

const ALWAYS: Bounds = () => true;

const REGION_DEFS: readonly RegionDef[] = [
    { name: "Al Kharid", regionId: 13106, extras: [13362, 13105], patches: [{ varbit: TRANSMIT.A, impl: "CACTUS" }] },
    { name: "Aldarin", regionId: 5421, extras: [5165, 5166, 5422, 5677, 5678], patches: [{ varbit: TRANSMIT.A, impl: "HOPS" }] },
    { name: "Anglers' Retreat", regionId: 9770, patches: [{ varbit: TRANSMIT.A, impl: "HARDWOOD_TREE" }] },
    { name: "Ardougne", regionId: 10290, extras: [10546], patches: [{ varbit: TRANSMIT.A, impl: "BUSH" }] },
    {
        name: "Ardougne",
        regionId: 10548,
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.D, impl: "HERB" },
            { varbit: TRANSMIT.E, impl: "COMPOST" },
        ],
    },
    {
        name: "Auburnvale",
        regionId: 5427,
        extras: [5428, 5684],
        patches: [
            { varbit: TRANSMIT.A, impl: "TREE" },
            { varbit: TRANSMIT.B, impl: "BELLADONNA" },
        ],
    },
    { name: "Avium Savannah", regionId: 6702, extras: [6446], patches: [{ varbit: TRANSMIT.A, impl: "HARDWOOD_TREE" }] },
    {
        name: "Brimhaven",
        regionId: 11058,
        extras: [11057],
        patches: [
            { varbit: TRANSMIT.A, impl: "FRUIT_TREE" },
            { varbit: TRANSMIT.B, impl: "SPIRIT_TREE" },
        ],
    },
    {
        name: "Catherby",
        regionId: 11062,
        extras: [11061, 11318, 11317],
        bounds: catherbyMainBounds,
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.D, impl: "HERB" },
            { varbit: TRANSMIT.E, impl: "COMPOST" },
        ],
    },
    { name: "Catherby", regionId: 11317, bounds: catherbyFruitBounds, patches: [{ varbit: TRANSMIT.A, impl: "FRUIT_TREE" }] },
    {
        name: "Civitas illa Fortis",
        regionId: 6192,
        extras: [6447, 6448, 6449, 6191, 6193],
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.D, impl: "HERB" },
            { varbit: TRANSMIT.E, impl: "COMPOST" },
        ],
    },
    { name: "Champions' Guild", regionId: 12596, patches: [{ varbit: TRANSMIT.A, impl: "BUSH" }] },
    { name: "Draynor Manor", regionId: 12340, patches: [{ varbit: TRANSMIT.A, impl: "BELLADONNA" }] },
    { name: "Entrana", regionId: 11060, extras: [11316], patches: [{ varbit: TRANSMIT.A, impl: "HOPS" }] },
    {
        name: "Etceteria",
        regionId: 10300,
        patches: [
            { varbit: TRANSMIT.A, impl: "BUSH" },
            { varbit: TRANSMIT.B, impl: "SPIRIT_TREE" },
        ],
    },
    { name: "Falador", regionId: 11828, extras: [12084], patches: [{ varbit: TRANSMIT.A, impl: "TREE" }] },
    {
        name: "Falador",
        regionId: 12083,
        bounds: faladorBounds,
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.D, impl: "HERB" },
            { varbit: TRANSMIT.E, impl: "COMPOST" },
        ],
    },
    {
        name: "Fossil Island",
        regionId: 14651,
        extras: [14907, 14908, 15164, 14652, 14906, 14650, 15162, 15163],
        bounds: fossilIslandBounds,
        patches: [
            { varbit: TRANSMIT.A, impl: "HARDWOOD_TREE" },
            { varbit: TRANSMIT.B, impl: "HARDWOOD_TREE" },
            { varbit: TRANSMIT.C, impl: "HARDWOOD_TREE" },
        ],
    },
    {
        name: "Seaweed",
        regionId: 15008,
        patches: [
            { varbit: TRANSMIT.A, impl: "SEAWEED" },
            { varbit: TRANSMIT.B, impl: "SEAWEED" },
        ],
    },
    {
        name: "Gnome Stronghold",
        regionId: 9781,
        extras: [9782, 9526, 9525],
        patches: [
            { varbit: TRANSMIT.A, impl: "TREE" },
            { varbit: TRANSMIT.B, impl: "FRUIT_TREE" },
        ],
    },
    {
        name: "Great Conch",
        regionId: 12581,
        extras: [12325, 12326, 12327, 12580, 12582, 12583, 12836, 12837, 12838, 12839, 13092, 13093, 13194],
        patches: [
            { varbit: TRANSMIT.A, impl: "CORAL" },
            { varbit: TRANSMIT.B, impl: "CORAL" },
            { varbit: TRANSMIT.C, impl: "CALQUAT" },
        ],
    },
    {
        name: "Harmony",
        regionId: 15148,
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "HERB" },
        ],
    },
    {
        name: "Kastori",
        regionId: 5423,
        extras: [5167, 5424],
        patches: [
            { varbit: TRANSMIT.A, impl: "CALQUAT" },
            { varbit: TRANSMIT.B, impl: "FRUIT_TREE" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
        ],
    },
    {
        name: "Kourend",
        regionId: 6967,
        extras: [6711],
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.D, impl: "HERB" },
            { varbit: TRANSMIT.E, impl: "COMPOST" },
            { varbit: TRANSMIT.F, impl: "SPIRIT_TREE" },
        ],
    },
    {
        name: "Kourend",
        regionId: 7223,
        patches: [
            { varbit: TRANSMIT.A1, impl: "GRAPES" },
            { varbit: TRANSMIT.A2, impl: "GRAPES" },
            { varbit: TRANSMIT.B1, impl: "GRAPES" },
            { varbit: TRANSMIT.B2, impl: "GRAPES" },
            { varbit: TRANSMIT.C1, impl: "GRAPES" },
            { varbit: TRANSMIT.C2, impl: "GRAPES" },
            { varbit: TRANSMIT.D1, impl: "GRAPES" },
            { varbit: TRANSMIT.D2, impl: "GRAPES" },
            { varbit: TRANSMIT.E1, impl: "GRAPES" },
            { varbit: TRANSMIT.E2, impl: "GRAPES" },
            { varbit: TRANSMIT.F1, impl: "GRAPES" },
            { varbit: TRANSMIT.F2, impl: "GRAPES" },
        ],
    },
    { name: "Lletya", regionId: 9265, extras: [11103], patches: [{ varbit: TRANSMIT.A, impl: "FRUIT_TREE" }] },
    { name: "Lumbridge", regionId: 12851, patches: [{ varbit: TRANSMIT.A, impl: "HOPS" }] },
    { name: "Lumbridge", regionId: 12594, extras: [12850], patches: [{ varbit: TRANSMIT.A, impl: "TREE" }] },
    { name: "Morytania", regionId: 13622, extras: [13878], patches: [{ varbit: TRANSMIT.A, impl: "MUSHROOM" }] },
    {
        name: "Morytania",
        regionId: 14391,
        extras: [14390],
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.D, impl: "HERB" },
            { varbit: TRANSMIT.E, impl: "COMPOST" },
        ],
    },
    { name: "Port Sarim", regionId: 12082, extras: [12083], bounds: portSarimBounds, patches: [{ varbit: TRANSMIT.A, impl: "SPIRIT_TREE" }] },
    { name: "Rimmington", regionId: 11570, extras: [11826], patches: [{ varbit: TRANSMIT.A, impl: "BUSH" }] },
    { name: "Seers' Village", regionId: 10551, extras: [10550], patches: [{ varbit: TRANSMIT.A, impl: "HOPS" }] },
    { name: "Tai Bwo Wannai", regionId: 11056, patches: [{ varbit: TRANSMIT.A, impl: "CALQUAT" }] },
    { name: "Taverley", regionId: 11573, extras: [11829], patches: [{ varbit: TRANSMIT.A, impl: "TREE" }] },
    { name: "Tree Gnome Village", regionId: 9777, extras: [10033], patches: [{ varbit: TRANSMIT.A, impl: "FRUIT_TREE" }] },
    { name: "Troll Stronghold", regionId: 11321, patches: [{ varbit: TRANSMIT.A, impl: "HERB" }] },
    { name: "Varrock", regionId: 12854, extras: [12853], patches: [{ varbit: TRANSMIT.A, impl: "TREE" }] },
    { name: "Yanille", regionId: 10288, patches: [{ varbit: TRANSMIT.A, impl: "HOPS" }] },
    { name: "Weiss", regionId: 11325, patches: [{ varbit: TRANSMIT.A, impl: "HERB" }] },
    { name: "Farming Guild", regionId: 5021, patches: [{ varbit: TRANSMIT.J, impl: "HESPORI" }] },
    {
        name: "Farming Guild",
        regionId: 4922,
        extras: [5177, 5178, 5179, 4921, 4923, 4665, 4666, 4667],
        patches: [
            { varbit: TRANSMIT.G, impl: "TREE" },
            { varbit: TRANSMIT.E, impl: "HERB" },
            { varbit: TRANSMIT.B, impl: "BUSH" },
            { varbit: TRANSMIT.H, impl: "FLOWER" },
            { varbit: TRANSMIT.C, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.D, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.N, impl: "BIG_COMPOST" },
            { varbit: TRANSMIT.F, impl: "CACTUS" },
            { varbit: TRANSMIT.A, impl: "SPIRIT_TREE" },
            { varbit: TRANSMIT.K, impl: "FRUIT_TREE" },
            { varbit: TRANSMIT.M, impl: "ANIMA" },
            { varbit: TRANSMIT.L, impl: "CELASTRUS" },
            { varbit: TRANSMIT.I, impl: "REDWOOD" },
        ],
    },
    {
        name: "Prifddinas",
        regionId: 13151,
        extras: [12895, 12894, 13150, 12994, 12993, 12737, 12738, 12126, 12127, 13250],
        patches: [
            { varbit: TRANSMIT.A, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.B, impl: "ALLOTMENT" },
            { varbit: TRANSMIT.C, impl: "FLOWER" },
            { varbit: TRANSMIT.E, impl: "CRYSTAL_TREE" },
            { varbit: TRANSMIT.D, impl: "COMPOST" },
        ],
    },
];

const REGIONS_BY_ID = new Map<number, FarmingRegion[]>();

for (const def of REGION_DEFS) {
    const region: FarmingRegion = {
        name: def.name,
        regionId: def.regionId,
        patches: def.patches,
        bounds: def.bounds ?? ALWAYS,
    };
    const ids = [def.regionId, ...(def.extras ?? [])];
    for (const id of ids) {
        let bucket = REGIONS_BY_ID.get(id);
        if (bucket === undefined) {
            bucket = [];
            REGIONS_BY_ID.set(id, bucket);
        }
        if (!bucket.includes(region)) {
            bucket.push(region);
        }
    }
}

export function regionsForLocation(regionId: number, x: number, y: number, plane: number): FarmingRegion[] {
    const bucket = REGIONS_BY_ID.get(regionId);
    if (bucket === undefined) {
        return [];
    }
    return bucket.filter((region) => region.bounds(x, y, plane));
}

export function regionBucket(regionId: number): readonly FarmingRegion[] {
    return REGIONS_BY_ID.get(regionId) ?? [];
}
