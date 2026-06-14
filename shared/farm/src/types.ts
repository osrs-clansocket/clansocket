export type CropState = "GROWING" | "HARVESTABLE" | "DISEASED" | "DEAD" | "EMPTY" | "FILLING";

export type ProduceKey =
    | "WEEDS"
    | "SCARECROW"
    | "POTATO"
    | "ONION"
    | "CABBAGE"
    | "TOMATO"
    | "SWEETCORN"
    | "STRAWBERRY"
    | "WATERMELON"
    | "SNAPE_GRASS"
    | "MARIGOLD"
    | "ROSEMARY"
    | "NASTURTIUM"
    | "WOAD"
    | "LIMPWURT"
    | "WHITE_LILY"
    | "REDBERRIES"
    | "CADAVABERRIES"
    | "DWELLBERRIES"
    | "JANGERBERRIES"
    | "WHITEBERRIES"
    | "POISON_IVY"
    | "BARLEY"
    | "HAMMERSTONE"
    | "ASGARNIAN"
    | "JUTE"
    | "YANILLIAN"
    | "FLAX"
    | "KRANDORIAN"
    | "WILDBLOOD"
    | "HEMP"
    | "COTTON"
    | "GUAM"
    | "MARRENTILL"
    | "TARROMIN"
    | "HARRALANDER"
    | "RANARR"
    | "TOADFLAX"
    | "IRIT"
    | "AVANTOE"
    | "KWUARM"
    | "HUASCA"
    | "SNAPDRAGON"
    | "CADANTINE"
    | "LANTADYME"
    | "DWARF_WEED"
    | "TORSTOL"
    | "GOUTWEED"
    | "ANYHERB"
    | "OAK"
    | "WILLOW"
    | "MAPLE"
    | "YEW"
    | "MAGIC"
    | "APPLE"
    | "BANANA"
    | "ORANGE"
    | "CURRY"
    | "PINEAPPLE"
    | "PAPAYA"
    | "PALM"
    | "DRAGONFRUIT"
    | "CACTUS"
    | "POTATO_CACTUS"
    | "TEAK"
    | "MAHOGANY"
    | "CAMPHOR"
    | "IRONWOOD"
    | "ROSEWOOD"
    | "ATTAS"
    | "IASOR"
    | "KRONOS"
    | "ELKHORN_CORAL"
    | "PILLAR_CORAL"
    | "UMBRAL_CORAL"
    | "SEAWEED"
    | "GRAPE"
    | "MUSHROOM"
    | "BELLADONNA"
    | "CALQUAT"
    | "SPIRIT_TREE"
    | "CELASTRUS"
    | "REDWOOD"
    | "HESPORI"
    | "CRYSTAL_TREE"
    | "EMPTY_COMPOST_BIN"
    | "COMPOST"
    | "SUPERCOMPOST"
    | "ULTRACOMPOST"
    | "ROTTEN_TOMATO"
    | "EMPTY_BIG_COMPOST_BIN"
    | "BIG_COMPOST"
    | "BIG_SUPERCOMPOST"
    | "BIG_ULTRACOMPOST"
    | "BIG_ROTTEN_TOMATO";

export type PatchImplementation =
    | "MUSHROOM"
    | "HESPORI"
    | "ALLOTMENT"
    | "HERB"
    | "FLOWER"
    | "BUSH"
    | "FRUIT_TREE"
    | "HOPS"
    | "TREE"
    | "HARDWOOD_TREE"
    | "REDWOOD"
    | "SPIRIT_TREE"
    | "ANIMA"
    | "BELLADONNA"
    | "CACTUS"
    | "CORAL"
    | "SEAWEED"
    | "CALQUAT"
    | "CELASTRUS"
    | "GRAPES"
    | "CRYSTAL_TREE"
    | "COMPOST"
    | "BIG_COMPOST";

export interface ProduceInfo {
    readonly name: string;
    readonly itemId: number;
}

export interface PatchStateResult {
    readonly produce: ProduceKey;
    readonly state: CropState;
}

export interface FarmingDecodeInput {
    readonly varbitId: number;
    readonly value: number;
    readonly regionId: number;
    readonly x: number;
    readonly y: number;
    readonly plane: number;
}

export interface FarmingDecodeResult {
    readonly cropId: number;
    readonly cropName: string;
    readonly state: CropState;
    readonly patchRegionId: number;
    readonly patchRegionName: string;
}

// Why a decode produced no result. Only the non-"out-of-bounds" reasons signal
// possible new/changed game content worth a manual table update; out-of-bounds
// is the expected skip when a transmit varbit fires while the player is near a
// farming region but not on a tile/plane that owns the patch.
export type FarmingDecodeMiss = "unmapped-region" | "out-of-bounds" | "no-patch" | "unknown-value";
