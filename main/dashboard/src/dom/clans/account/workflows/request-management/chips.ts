import { button, span, type Instance } from "../../../../factory";
import type { ClanSearchHit } from "../../../../../state/clans/clans-client/index.js";
import { buildClanGlyph } from "./helpers.js";
import {
    ACCOUNT_CHIP_CLASS,
    ACCOUNT_CHIP_NAME_CLASS,
    ACCOUNT_CHIP_X_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export interface ChipController {
    selectedClans: Map<string, ClanSearchHit>;
    addChip: (hit: ClanSearchHit) => void;
    removeChip: (slug: string) => void;
    removeLast: () => void;
}

export function createChipController(clanField: Instance, clanInput: Instance<HTMLInputElement>): ChipController {
    const selectedClans = new Map<string, ClanSearchHit>();
    const chipInstances = new Map<string, Instance>();

    const removeChip = (slug: string): void => {
        chipInstances.get(slug)?.destroy();
        chipInstances.delete(slug);
        selectedClans.delete(slug);
    };

    const addChip = (hit: ClanSearchHit): void => {
        if (selectedClans.has(hit.slug)) return;
        const closeBtn = button({
            text: "✕",
            classes: [ACCOUNT_CHIP_X_CLASS],
            type: "button",
            ariaLabel: `Remove ${hit.displayName}`,
            context: "remove this clan from the selection",
            meta: ["action", "clan"],
            onClick: (e) => {
                e.stopPropagation();
                removeChip(hit.slug);
                clanInput.el.focus();
            },
        });
        const chip = span({ classes: [ACCOUNT_CHIP_CLASS], data: { slug: hit.slug }, context: null, meta: null }, [
            buildClanGlyph(hit, "account__chip-icon", "account__chip-icon-img", "account__chip-icon-glyph"),
            span({ classes: [ACCOUNT_CHIP_NAME_CLASS], text: hit.displayName, context: null, meta: null }),
            closeBtn,
        ]);
        if (hit.color) chip.el.style.setProperty("--clan-accent", hit.color);
        clanField.addBefore(chip, clanInput.el);
        selectedClans.set(hit.slug, hit);
        chipInstances.set(hit.slug, chip);
    };

    const removeLast = (): void => {
        const lastSlug = [...selectedClans.keys()].pop();
        if (lastSlug) removeChip(lastSlug);
    };

    return { selectedClans, addChip, removeChip, removeLast };
}
