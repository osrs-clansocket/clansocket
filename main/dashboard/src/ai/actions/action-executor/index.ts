import type { Actions, ActionResult } from "../action-types.js";
import { appendSkippedNonRouteVerbs, reportAudit } from "./audit-report.js";
import { type ExecuteOptions } from "./constants.js";
import { doHighlight, doNavigate, doRoute, doShow } from "./display.js";
import {
    doBlur,
    doCheck,
    doClick,
    doFocus,
    doPressKey,
    doSelectOption,
    doSetValue,
    doSubmit,
    doToggleOpen,
} from "./forms.js";

export async function executeActions(actions: Actions | null, opts: ExecuteOptions = {}): Promise<ActionResult[]> {
    if (!actions) return [];
    const results: ActionResult[] = [];

    if (actions.route) {
        results.push(doRoute(actions.route));
        appendSkippedNonRouteVerbs(actions, results);
        if (!opts.silent) for (const r of results) reportAudit(opts.chainId, r);
        return results;
    }

    if (actions.setValue) for (const op of actions.setValue) results.push(doSetValue(op));
    if (actions.check) for (const op of actions.check) results.push(doCheck(op));
    if (actions.selectOption) for (const op of actions.selectOption) results.push(doSelectOption(op));
    if (actions.pressKey) for (const op of actions.pressKey) results.push(doPressKey(op));
    if (actions.toggleOpen) for (const op of actions.toggleOpen) results.push(doToggleOpen(op));
    if (actions.click) results.push(doClick(actions.click));
    if (actions.submit) results.push(doSubmit(actions.submit));
    if (actions.focus) results.push(doFocus(actions.focus));
    if (actions.blur) results.push(doBlur(actions.blur));
    if (actions.navigate) results.push(doNavigate(actions.navigate));
    if (actions.highlight) results.push(...doHighlight(actions.highlight));
    if (actions.show) results.push(doShow(actions.show));

    if (!opts.silent) for (const r of results) reportAudit(opts.chainId, r);

    return results;
}
