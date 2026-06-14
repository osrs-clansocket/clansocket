import { recordAiAction, type AiActionAuditMeta } from "../../../state/clans/audit-client.js";
import type { Actions, ActionResult } from "../action-types.js";
import {
    AUDIT_VERBS,
    ERR_SKIPPED_ROUTE,
    VERB_BLUR,
    VERB_CHECK,
    VERB_CLICK,
    VERB_FOCUS,
    VERB_HIGHLIGHT,
    VERB_NAVIGATE,
    VERB_PRESS_KEY,
    VERB_SELECT_OPTION,
    VERB_SET_VALUE,
    VERB_SHOW,
    VERB_SUBMIT,
    VERB_TOGGLE_OPEN,
} from "./constants.js";
import { fail } from "./helpers.js";

export function reportAudit(chainId: string | undefined, r: ActionResult): void {
    if (!AUDIT_VERBS.has(r.verb)) return;
    const meta: AiActionAuditMeta = { success: r.success };
    if (chainId) meta.chainId = chainId;
    if (r.error) meta.error = r.error;
    if (r.meta) meta.args = r.meta;
    recordAiAction(r.verb, r.target, meta);
}

const ARRAY_OP_VERBS = [VERB_SET_VALUE, VERB_CHECK, VERB_SELECT_OPTION, VERB_PRESS_KEY, VERB_TOGGLE_OPEN] as const;

const SINGLE_TARGET_VERBS = [VERB_CLICK, VERB_SUBMIT, VERB_FOCUS, VERB_BLUR, VERB_NAVIGATE, VERB_SHOW] as const;

export function appendSkippedNonRouteVerbs(actions: Actions, results: ActionResult[]): void {
    for (const verb of ARRAY_OP_VERBS) {
        const ops = actions[verb];
        if (!ops) continue;
        for (const op of ops) results.push(fail(verb, op.target, ERR_SKIPPED_ROUTE));
    }
    for (const verb of SINGLE_TARGET_VERBS) {
        const target = actions[verb];
        if (target) results.push(fail(verb, target, ERR_SKIPPED_ROUTE));
    }
    for (const key of actions.highlight ?? []) {
        results.push(fail(VERB_HIGHLIGHT, key, ERR_SKIPPED_ROUTE));
    }
}
