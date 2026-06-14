import { BTN_VARIANT_OUTLINE, button, derived, div, heading, paragraph, type Child } from "../../../factory/index.js";
import { isPasskeyError, passkeyClient } from "../../../../state/passkey/client/index.js";
import { backupMetaStore, type BackupMetaState } from "../../../../state/passkey/stores/backup-meta-store.js";
import { consumeFreshBackupCodesFromSession, renderCodesPanel } from "../../codes-panel.js";
import { FORM_HINT } from "../../../forms/form-classes.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
} from "../../../../shared/constants/account-constants.js";

function metaText(state: BackupMetaState): string {
    if (!state.loaded) return "loading…";
    if (state.meta === null) return "none generated yet.";
    return `${state.meta.remainingCount} of ${state.meta.totalCount} remaining.`;
}

export function buildBackupCodesPanel(): HTMLElement {
    const codesHost = div({ context: null, meta: null });
    const meta = paragraph({
        classes: [FORM_HINT],
        text: derived(() => metaText(backupMetaStore.state$())),
        context: null,
        meta: null,
    });
    const btn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Generate",
        context: "generate a fresh set of backup codes",
        meta: ["action", "account"],
        onClick: async () => {
            btn.el.disabled = true;
            const res = await passkeyClient.generateBackupCodes();
            btn.el.disabled = false;
            if (isPasskeyError(res)) return;
            codesHost.setChildren(renderCodesPanel(res.codes, res.fileContent, "Save these now. They appear once."));
            void backupMetaStore.refresh();
        },
    });
    const bodyChildren: Child[] = [meta];
    const fresh = consumeFreshBackupCodesFromSession();
    if (fresh !== null) bodyChildren.push(renderCodesPanel(fresh.codes, fresh.file, "ur new backup codes — save now."));
    bodyChildren.push(codesHost);
    return div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Backup codes", context: null, meta: null }),
        div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null }, bodyChildren),
        div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null }, [btn]),
    ]).el;
}
