import { clanAvatarInner, span, type Instance } from "../../../../factory";
import type { ClanSearchHit, ManagerSubmitResult } from "../../../../../state/clans/clans-client/index.js";
import { ACCOUNT_AUTOCOMPLETE_DOT_CLASS } from "../../../../../shared/constants/account-constants.js";

export const SEARCH_DEBOUNCE_MS = 150;
export const MIN_SEARCH_LEN = 1;

export function buildClanGlyph(hit: ClanSearchHit, wrapClass: string, imgClass: string, glyphClass: string): Instance {
    const wrap = span({ classes: [wrapClass], context: null, meta: null });
    wrap.addChild(
        clanAvatarInner({
            slug: hit.slug,
            iconKind: hit.iconKind,
            iconValue: hit.iconValue,
            imgClass,
            glyphClass,
            context: null,
            meta: null,
        }),
    );
    return wrap;
}

export function buildColorDot(color: string | null): Instance {
    const dot = span({ classes: [ACCOUNT_AUTOCOMPLETE_DOT_CLASS], ariaHidden: "true", context: null, meta: null });
    if (color) dot.el.style.setProperty("--clan-accent", color);
    return dot;
}

export function formatResultLine(result: ManagerSubmitResult, displayName: string): string {
    if (!result.ok) return `✗ ${displayName}: ${result.message ?? result.reason}`;
    if (result.alreadyManager === true) return `○ ${displayName}: already a manager`;
    if (result.status === "granted") {
        return `✓ ${displayName}: auto-granted via RSN '${result.rsn}' (rank '${result.rank}')`;
    }
    return `⌛ ${displayName}: awaiting owner approval`;
}
