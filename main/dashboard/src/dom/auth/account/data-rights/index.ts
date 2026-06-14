import { anchor, BTN_VARIANT_OUTLINE, button, div, effect, heading, paragraph, snapshot } from "../../../factory";
import { dataRightsClient } from "../../../../state/data-rights/data-rights-client/index.js";
import { userStatsStore } from "../../../../state/data-rights/stores/user-stats-store.js";
import { glassConfirm } from "../../../forms/glass/modals/glass-confirm.js";
import { formatCooldown } from "./format.js";
import { buildStatsGrid } from "./stats-grid.js";
import { FORM_FORM_ROW, FORM_FORM_ROW_FILL, FORM_HINT } from "../../../forms/form-classes.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
    ACCOUNT_REMOVE_BTN_CLASS,
} from "../../../../shared/constants/account-constants.js";

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = anchor({
        href: url,
        download: filename,
        context: "hidden data-export download trigger",
        meta: ["action"],
    });
    a.mount(document.body);
    a.el.click();
    a.destroy();
    URL.revokeObjectURL(url);
}

async function confirmLeaveSite(): Promise<boolean> {
    return glassConfirm({
        title: "Leave the site",
        message:
            "Hard wipe. Goes: ur site profile + login, every clan u own (the whole clan dies — its members + tokens + data with it), ur telemetry / clan chats / sessions across every clan u were ever in, and every clan u manage drops u as manager. U get logged out. Cannot be undone.",
        confirmLabel: "Leave and wipe everything",
        cancelLabel: "Cancel",
        danger: true,
    });
}

export function buildDataRightsPanel(): HTMLElement {
    const status = paragraph({ classes: [FORM_HINT], text: "", context: null, meta: null });
    const stats = buildStatsGrid();
    const exportBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Export zip",
        context: "export all your data as a downloadable zip",
        meta: ["action", "data"],
        onClick: async () => {
            exportBtn.setText("Preparing…");
            exportBtn.el.disabled = true;
            const result = await dataRightsClient.exportMyData();
            exportBtn.el.disabled = false;
            exportBtn.setText("Export zip");
            if (result.ok) {
                triggerDownload(result.blob, result.filename);
                status.setText("Download started.");
                return;
            }
            if (result.reason === "cooldown") status.setText(`Cooldown · ${formatCooldown(result.retryAfterMs)}`);
            else if (result.reason === "no_data") status.setText("No game data linked to ur account.");
            else status.setText(snapshot(result.message ?? `export failed.`));
        },
    });
    const leaveBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [ACCOUNT_REMOVE_BTN_CLASS],
        text: "Remove all data",
        context: "permanently delete all your data and leave the site",
        meta: ["destructive", "account"],
        onClick: async () => {
            const confirmed = await confirmLeaveSite();
            if (!confirmed) return;
            leaveBtn.setText("Wiping…");
            leaveBtn.el.disabled = true;
            const result = await dataRightsClient.deleteMyData();
            leaveBtn.el.disabled = false;
            leaveBtn.setText("Remove all data");
            if (!result.ok) {
                status.setText(snapshot(result.message ?? `remove failed.`));
                return;
            }
            window.location.assign("/");
        },
    });
    const browseBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Browse my data",
        context: "browse your stored data table by table",
        meta: ["nav", "data"],
        onClick: () => {
            history.pushState(null, "", "/data-rights");
            window.dispatchEvent(new PopStateEvent("popstate"));
        },
    });
    const root = div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Data rights", context: null, meta: null }),
        div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null }, [stats.el, status]),
        div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null }, [
            div({ classes: [FORM_FORM_ROW, FORM_FORM_ROW_FILL], context: null, meta: null }, [browseBtn, exportBtn]),
            leaveBtn,
        ]),
    ]);
    let settled = false;
    root.trackDispose(
        effect(() => {
            const s = userStatsStore.stats$();
            if (s === null && !settled) return;
            settled = true;
            stats.set(s);
        }),
    );
    return root.el;
}
