import { paragraph, type Instance } from "../factory";
import { ACCOUNT_EMPTY_CLASS } from "../../shared/constants/account-constants.js";

export function statusLine(): Instance {
    const p = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], text: "", context: null, meta: null });
    p.el.hidden = true;
    return p;
}

export function setStatus(inst: Instance, text: string): void {
    inst.el.hidden = text.length === 0;
    inst.setText(text);
}
