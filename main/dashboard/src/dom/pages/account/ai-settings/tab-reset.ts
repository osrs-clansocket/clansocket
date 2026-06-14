import { button, effect, type Instance } from "../../../factory";
import { CLIENT_SLOTS, personaStore, type SlotTier } from "../../../../ai/persona-store/index.js";
import { ATTR_HIDDEN, HIDDEN_FALSE, HIDDEN_TRUE, hasOwn } from "./shared.js";

const RESET_ALL_CLASS = "account-ai-settings__reset-all";

function anyTierHasOverrides(tiers: readonly SlotTier[]): boolean {
    const overrides = personaStore.overrides$();
    for (const slot of CLIENT_SLOTS) {
        if (!tiers.includes(slot.tier)) continue;
        if (hasOwn(overrides, slot.key)) return true;
    }
    return false;
}

export function buildTabResetButton(tiers: readonly SlotTier[], tierLabel: string): Instance<HTMLButtonElement> {
    const btn = button({
        classes: [RESET_ALL_CLASS],
        text: `Reset all ${tierLabel}`,
        ariaLabel: `Reset all ${tierLabel} slots to defaults`,
        title: `Reset all ${tierLabel} slots`,
        context: `reset every overridden slot in the ${tierLabel} tab`,
        meta: ["destructive"],
        onClick: () => {
            for (const tier of tiers) personaStore.resetTier(tier);
        },
    });
    btn.trackDispose(
        effect(() => {
            btn.setAttr(ATTR_HIDDEN, anyTierHasOverrides(tiers) ? HIDDEN_FALSE : HIDDEN_TRUE);
        }),
    );
    return btn;
}
