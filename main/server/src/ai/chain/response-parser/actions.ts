import type { Actions } from "../../types.js";
import {
    normalizeCheckOp,
    normalizePressKeyOp,
    normalizeSelectOptionOp,
    normalizeSetValueOp,
    normalizeToggleOpenOp,
} from "./action-ops.js";
import { pickOpArray, pickString, pickStringArray } from "./pickers.js";

export function normalizeActions(raw: unknown): Actions | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const out: Actions = {};
    const navigate = pickString(r, "navigate");
    if (navigate) out.navigate = navigate;
    const highlight = pickStringArray(r, "highlight");
    if (highlight) out.highlight = highlight;
    const show = pickString(r, "show");
    if (show) out.show = show;
    const route = pickString(r, "route");
    if (route) out.route = route;
    const click = pickString(r, "click");
    if (click) out.click = click;
    const setValue = pickOpArray(r, "setValue", normalizeSetValueOp);
    if (setValue) out.setValue = setValue;
    const check = pickOpArray(r, "check", normalizeCheckOp);
    if (check) out.check = check;
    const selectOption = pickOpArray(r, "selectOption", normalizeSelectOptionOp);
    if (selectOption) out.selectOption = selectOption;
    const submit = pickString(r, "submit");
    if (submit) out.submit = submit;
    const focus = pickString(r, "focus");
    if (focus) out.focus = focus;
    const blur = pickString(r, "blur");
    if (blur) out.blur = blur;
    const pressKey = pickOpArray(r, "pressKey", normalizePressKeyOp);
    if (pressKey) out.pressKey = pressKey;
    const toggleOpen = pickOpArray(r, "toggleOpen", normalizeToggleOpenOp);
    if (toggleOpen) out.toggleOpen = toggleOpen;
    return Object.keys(out).length > 0 ? out : null;
}
