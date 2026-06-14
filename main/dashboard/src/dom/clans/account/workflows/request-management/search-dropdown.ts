import { BTN_VARIANT_DEFAULT, button, input, span, type Instance } from "../../../../factory";
import { clansClient, type ClanSearchHit } from "../../../../../state/clans/clans-client/index.js";
import type { ChipController } from "./chips.js";
import { buildClanGlyph, buildColorDot } from "./helpers.js";
import {
    ACCOUNT_AUTOCOMPLETE_CHECK_CLASS,
    ACCOUNT_AUTOCOMPLETE_NAME_CLASS,
    ACCOUNT_AUTOCOMPLETE_ROW_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export interface SearchController {
    runSearch: (q: string) => Promise<void>;
    closeAndClear: () => void;
}

export function createSearchController(
    dropdown: Instance,
    chips: ChipController,
    clanInput: Instance<HTMLInputElement>,
): SearchController {
    function renderMatches(matches: readonly ClanSearchHit[]): void {
        if (matches.length === 0) {
            dropdown.el.hidden = true;
            dropdown.clear();
            return;
        }
        const rows = matches.map((hit) => {
            const isSelected = chips.selectedClans.has(hit.slug);
            const check = input({
                ariaLabel: "Clan selected",
                classes: [ACCOUNT_AUTOCOMPLETE_CHECK_CLASS],
                type: "checkbox",
                tabindex: "-1",
                ariaHidden: "true",
                context: "selection state for this clan (toggled by the row)",
                meta: ["input"],
            });
            check.el.checked = isSelected;
            return button(
                {
                    variant: BTN_VARIANT_DEFAULT,
                    classes: [ACCOUNT_AUTOCOMPLETE_ROW_CLASS],
                    type: "button",
                    ariaLabel: hit.displayName,
                    data: { slug: hit.slug },
                    context: "toggle selecting this clan",
                    meta: ["choice", "clan"],
                    onClick: () => {
                        if (chips.selectedClans.has(hit.slug)) {
                            chips.removeChip(hit.slug);
                        } else {
                            chips.addChip(hit);
                        }
                        clanInput.el.value = "";
                        dropdown.el.hidden = true;
                        dropdown.clear();
                        clanInput.el.focus();
                    },
                },
                [
                    check,
                    buildClanGlyph(
                        hit,
                        "account__autocomplete-avatar",
                        "account__autocomplete-avatar-img",
                        "account__autocomplete-avatar-glyph",
                    ),
                    span({
                        classes: [ACCOUNT_AUTOCOMPLETE_NAME_CLASS],
                        text: hit.displayName,
                        context: null,
                        meta: null,
                    }),
                    buildColorDot(hit.color),
                ],
            );
        });
        dropdown.setChildren(...rows);
        dropdown.el.hidden = false;
    }

    return {
        runSearch: async (q: string): Promise<void> => {
            const hits = await clansClient.searchClans(q);
            renderMatches(hits);
        },
        closeAndClear: () => {
            dropdown.el.hidden = true;
            dropdown.clear();
        },
    };
}
