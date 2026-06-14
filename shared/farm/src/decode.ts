import { regionsForLocation, regionBucket } from "./farming-world.ts";
import { forVarbitValue } from "./patch-states.ts";
import { PRODUCE } from "./produce.ts";
import type { FarmingDecodeInput, FarmingDecodeResult, FarmingDecodeMiss } from "./types.ts";

// Resolves a raw farming transmit varbit into crop + state + the real patch
// region. The transmit varbits are positional (reused per region), so the
// player's location selects the candidate regions; a varbit match picks the
// patch; forVarbitValue rejects values outside that patch type's range, which
// also disambiguates regions that share a varbit. First non-null wins.
export function decodeFarmingPatch(input: FarmingDecodeInput): FarmingDecodeResult | null {
    const { varbitId, value, regionId, x, y, plane } = input;
    const candidates = regionsForLocation(regionId, x, y, plane);
    for (const region of candidates) {
        for (const patch of region.patches) {
            if (patch.varbit !== varbitId) {
                continue;
            }
            const result = forVarbitValue(patch.impl, value);
            if (result === null) {
                continue;
            }
            const produce = PRODUCE[result.produce];
            return {
                cropId: produce.itemId,
                cropName: produce.name,
                state: result.state,
                patchRegionId: region.regionId,
                patchRegionName: region.name,
            };
        }
    }
    return null;
}

// Explains why decodeFarmingPatch returned null. Returns null when the input
// would in fact decode. Used to log only likely-new-content misses and ignore
// the expected out-of-bounds skips.
export function classifyFarmingDecode(input: FarmingDecodeInput): FarmingDecodeMiss | null {
    const { varbitId, value, regionId, x, y, plane } = input;
    const bucket = regionBucket(regionId);
    if (bucket.length === 0) {
        return "unmapped-region";
    }
    const candidates = bucket.filter((region) => region.bounds(x, y, plane));
    if (candidates.length === 0) {
        return "out-of-bounds";
    }
    let sawPatch = false;
    for (const region of candidates) {
        for (const patch of region.patches) {
            if (patch.varbit !== varbitId) {
                continue;
            }
            sawPatch = true;
            if (forVarbitValue(patch.impl, value) !== null) {
                return null;
            }
        }
    }
    return sawPatch ? "unknown-value" : "no-patch";
}
