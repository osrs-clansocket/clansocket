import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFarmingPatch, classifyFarmingDecode } from "../index.ts";

const A = 4771;
const B = 4772;
const D = 4774;
const E = 4775;
const A1 = 4953;

test("herb patch decodes ranarr growing at Catherby", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: D, value: 32, regionId: 11062, x: 2810, y: 3460, plane: 0 }), {
        cropId: 257,
        cropName: "Ranarr",
        state: "GROWING",
        patchRegionId: 11062,
        patchRegionName: "Catherby",
    });
});

test("region 12083 resolves to Falador allotment when north of y=3272", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A, value: 10, regionId: 12083, x: 3030, y: 3300, plane: 0 }), {
        cropId: 1942,
        cropName: "Potato",
        state: "HARVESTABLE",
        patchRegionId: 12083,
        patchRegionName: "Falador",
    });
});

test("region 12083 resolves to Port Sarim spirit tree when south of y=3272", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A, value: 10, regionId: 12083, x: 3030, y: 3260, plane: 0 }), {
        cropId: 6063,
        cropName: "Spirit tree",
        state: "GROWING",
        patchRegionId: 12082,
        patchRegionName: "Port Sarim",
    });
});

test("grape patch harvestable in Kourend vinery (region 7223)", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A1, value: 12, regionId: 7223, x: 1740, y: 3550, plane: 0 }), {
        cropId: 1987,
        cropName: "Grape",
        state: "HARVESTABLE",
        patchRegionId: 7223,
        patchRegionName: "Kourend",
    });
});

test("compost bin empty state decodes to EMPTY", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: E, value: 0, regionId: 10548, x: 2660, y: 3375, plane: 0 }), {
        cropId: 3271,
        cropName: "Compost Bin",
        state: "EMPTY",
        patchRegionId: 10548,
        patchRegionName: "Ardougne",
    });
});

test("empty allotment decodes to weeds growing", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A, value: 0, regionId: 10548, x: 2660, y: 3375, plane: 0 }), {
        cropId: 6055,
        cropName: "Weeds",
        state: "GROWING",
        patchRegionId: 10548,
        patchRegionName: "Ardougne",
    });
});

test("extra region id resolves to primary patch region", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A, value: 8, regionId: 13105, x: 3300, y: 3200, plane: 0 }), {
        cropId: 6016,
        cropName: "Cactus",
        state: "GROWING",
        patchRegionId: 13106,
        patchRegionName: "Al Kharid",
    });
});

test("tree patch decodes oak harvestable", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A, value: 13, regionId: 11573, x: 2930, y: 3440, plane: 0 }), {
        cropId: 1521,
        cropName: "Oak",
        state: "HARVESTABLE",
        patchRegionId: 11573,
        patchRegionName: "Taverley",
    });
});

test("fossil island hardwood resolves on plane 0", () => {
    assert.deepEqual(decodeFarmingPatch({ varbitId: A, value: 8, regionId: 14651, x: 3700, y: 3800, plane: 0 }), {
        cropId: 6333,
        cropName: "Teak",
        state: "GROWING",
        patchRegionId: 14651,
        patchRegionName: "Fossil Island",
    });
});

test("unknown region returns null", () => {
    assert.equal(decodeFarmingPatch({ varbitId: A, value: 8, regionId: 99999, x: 0, y: 0, plane: 0 }), null);
});

test("value in a decode gap returns null (crystal tree)", () => {
    assert.equal(decodeFarmingPatch({ varbitId: E, value: 5, regionId: 13151, x: 3250, y: 6100, plane: 0 }), null);
});

test("tree patch null gap value returns null", () => {
    assert.equal(decodeFarmingPatch({ varbitId: A, value: 76, regionId: 11573, x: 2930, y: 3440, plane: 0 }), null);
});

test("fossil island rejects plane 1 (varbits not for this patch)", () => {
    assert.equal(decodeFarmingPatch({ varbitId: A, value: 8, regionId: 14651, x: 3700, y: 3800, plane: 1 }), null);
});

test("fossil island rejects early-transmit ladder tile", () => {
    assert.equal(decodeFarmingPatch({ varbitId: A, value: 8, regionId: 14651, x: 3753, y: 3869, plane: 0 }), null);
});

test("classify returns null when input would decode", () => {
    assert.equal(classifyFarmingDecode({ varbitId: A, value: 13, regionId: 11573, x: 2930, y: 3440, plane: 0 }), null);
});

test("classify flags unmapped region", () => {
    assert.equal(classifyFarmingDecode({ varbitId: A, value: 8, regionId: 99999, x: 0, y: 0, plane: 0 }), "unmapped-region");
});

test("classify flags out-of-bounds as expected skip", () => {
    assert.equal(classifyFarmingDecode({ varbitId: A, value: 8, regionId: 14651, x: 3700, y: 3800, plane: 1 }), "out-of-bounds");
});

test("classify flags a varbit no patch owns", () => {
    assert.equal(classifyFarmingDecode({ varbitId: B, value: 8, regionId: 11573, x: 2930, y: 3440, plane: 0 }), "no-patch");
});

test("classify flags an unknown value for a known patch", () => {
    assert.equal(classifyFarmingDecode({ varbitId: A, value: 76, regionId: 11573, x: 2930, y: 3440, plane: 0 }), "unknown-value");
});
