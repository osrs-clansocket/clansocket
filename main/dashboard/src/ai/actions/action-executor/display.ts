import { createInstance } from "../../../dom/factory/index.js";
import { scrollToTarget } from "../../../dom/factory/layout-ops/structural/scroll-to.js";
import { router } from "../../../managers/router/index.js";
import type { ActionResult } from "../action-types.js";
import {
    HIGHLIGHT_DURATION,
    HIGHLIGHT_EFFECT,
    PANEL_HIDDEN_CLASS,
    VERB_HIGHLIGHT,
    VERB_NAVIGATE,
    VERB_ROUTE,
    VERB_SHOW,
} from "./constants.js";
import { fail, makeElementAction, ok, withFoundElement } from "./helpers.js";

const keyIdentity = (key: string): string => key;

export const doNavigate = makeElementAction(VERB_NAVIGATE, keyIdentity, (el, key) => {
    scrollToTarget(el);
    return ok(VERB_NAVIGATE, key);
});

export const doShow = makeElementAction(VERB_SHOW, keyIdentity, (el, key) => {
    const inst = createInstance(el);
    inst.removeAttr("style");
    inst.toggleClass(PANEL_HIDDEN_CLASS, false);
    return ok(VERB_SHOW, key);
});

export function doHighlight(keys: readonly string[]): ActionResult[] {
    const results: ActionResult[] = [];
    for (const key of keys) {
        results.push(
            withFoundElement(key, VERB_HIGHLIGHT, (el) => {
                const inst = createInstance(el);
                inst.addEffect(HIGHLIGHT_EFFECT);
                setTimeout(() => inst.removeEffect(HIGHLIGHT_EFFECT), HIGHLIGHT_DURATION);
                return ok(VERB_HIGHLIGHT, key);
            }),
        );
    }
    return results;
}

export function doRoute(path: string): ActionResult {
    try {
        router.navigate(path);
        return ok(VERB_ROUTE, path);
    } catch (err) {
        return fail(VERB_ROUTE, path, (err as Error).message);
    }
}
