import { resolveItemAsset } from "./resolve-item-asset.js";
import { resolveSkillAsset } from "./resolve-skill-asset.js";
import { resolveSlotAsset } from "./resolve-slot-asset.js";
import { resolvePrayerAsset } from "./resolve-prayer-asset.js";
import { resolveRankAsset } from "./resolve-rank-asset.js";
import { resolveAccountTypeAsset } from "./resolve-account-type-asset.js";
import { resolveHiscoresAsset } from "./resolve-hiscores-asset.js";
import { resolveTierAsset } from "./resolve-tier-asset.js";
import { resolvePetAsset } from "./resolve-pet-asset.js";
import { resolveQuestAsset } from "./resolve-quest-asset.js";
import { resolveDiaryAsset } from "./resolve-diary-asset.js";

type ResolverFn = (table: string, column: string, value: unknown, row: Record<string, unknown>) => string | null;

const RESOLVERS: Record<string, ResolverFn> = {
    item_id: resolveItemAsset,
    item_name: resolveItemAsset,
    crop_id: resolveItemAsset,
    crop_name: resolveItemAsset,
    pet_item_name: resolvePetAsset,
    skill: resolveSkillAsset,
    slot: resolveSlotAsset,
    prayer_name: resolvePrayerAsset,
    rank: resolveRankAsset,
    current_rank: resolveRankAsset,
    new_rank: resolveRankAsset,
    account_type: resolveAccountTypeAsset,
    source_name: resolveHiscoresAsset,
    cause_name: resolveHiscoresAsset,
    target_name: resolveHiscoresAsset,
    tier: resolveTierAsset,
    quest_name: resolveQuestAsset,
    diary_name: resolveDiaryAsset,
};

export function resolveColumnAsset(
    table: string,
    column: string,
    value: unknown,
    row: Record<string, unknown>,
): string | null {
    const fn = RESOLVERS[column];
    if (fn === undefined) return null;
    return fn(table, column, value, row);
}
