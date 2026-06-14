import { anchor, BTN_VARIANT_PRIMARY, button, div, paragraph } from "../factory";
import { FORM_HINT } from "../forms/form-classes.js";
import {
    ACCOUNT_BOOTSTRAP_CLASS,
    ACCOUNT_CODES_SCROLL_CLASS,
    ACCOUNT_TOKEN_PLAINTEXT_CLASS,
} from "../../shared/constants/account-constants.js";

const FRESH_CODES_KEY = "clansocket:fresh-backup-codes";

export function downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = anchor({
        href: url,
        download: filename,
        context: "programmatic file download trigger",
        meta: ["action"],
    });
    a.mount(document.body);
    a.el.click();
    a.destroy();
    URL.revokeObjectURL(url);
}

export function renderCodesPanel(codes: string[], fileContent: string, intro: string): HTMLElement {
    const scroll = div(
        { classes: [ACCOUNT_CODES_SCROLL_CLASS], context: null, meta: null },
        codes.map((c) => paragraph({ classes: [ACCOUNT_TOKEN_PLAINTEXT_CLASS], text: c, context: null, meta: null })),
    );
    return div({ classes: [ACCOUNT_BOOTSTRAP_CLASS], context: null, meta: null }, [
        paragraph({ classes: [FORM_HINT], text: intro, context: null, meta: null }),
        scroll,
        button({
            variant: BTN_VARIANT_PRIMARY,
            compact: true,
            text: "Download as .txt",
            context: "download the backup codes as a .txt file",
            meta: ["action", "account"],
            onClick: () => downloadFile("clansocket-backup-codes.txt", fileContent),
        }),
    ]).el;
}

export function consumeFreshBackupCodesFromSession(): { codes: string[]; file: string } | null {
    const raw = sessionStorage.getItem(FRESH_CODES_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FRESH_CODES_KEY);
    try {
        const parsed = JSON.parse(raw) as { codes?: unknown; file?: unknown };
        const codes = Array.isArray(parsed.codes) ? parsed.codes.filter((c): c is string => typeof c === "string") : [];
        if (codes.length === 0) return null;
        return { codes, file: typeof parsed.file === "string" ? parsed.file : "" };
    } catch {
        return null;
    }
}
