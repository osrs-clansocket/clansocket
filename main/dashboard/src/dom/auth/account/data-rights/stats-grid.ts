import { div, paragraph, span, type Instance } from "../../../factory";
import type { UserDataStats } from "../../../../state/data-rights/data-rights-client/index.js";
import { formatBytes, formatCount, formatSince } from "./format.js";
import { FORM_HINT } from "../../../forms/form-classes.js";
import {
    ACCOUNT_STAT_CLASS,
    ACCOUNT_STAT_LABEL_CLASS,
    ACCOUNT_STAT_VALUE_CLASS,
    ACCOUNT_STATS_CLASS,
} from "../../../../shared/constants/account-constants.js";

function buildStat(label: string, valueText: string, titleText?: string): Instance {
    const value = span({ classes: [ACCOUNT_STAT_VALUE_CLASS], text: valueText, context: null, meta: null });
    if (titleText) value.setAttr("title", titleText);
    return div({ classes: [ACCOUNT_STAT_CLASS], context: null, meta: null }, [
        span({ classes: [ACCOUNT_STAT_LABEL_CLASS], text: label, context: null, meta: null }),
        value,
    ]);
}

export function buildStatsGrid(): { el: HTMLElement; set(stats: UserDataStats | null): void } {
    const placeholder = paragraph({ classes: [FORM_HINT], text: "Loading…", context: null, meta: null });
    const wrap = div({ classes: [ACCOUNT_STATS_CLASS], context: null, meta: null }, [placeholder]);
    return {
        el: wrap.el,
        set(stats: UserDataStats | null): void {
            if (!stats) {
                wrap.setChildren(
                    paragraph({ classes: [FORM_HINT], text: "Couldnt load stats.", context: null, meta: null }),
                );
                return;
            }
            if (stats.totalRows === 0) {
                wrap.setChildren(
                    paragraph({
                        classes: [FORM_HINT],
                        text: "No game data linked to ur account.",
                        context: null,
                        meta: null,
                    }),
                );
                return;
            }
            const sinceTitle = stats.firstEntryAt ? new Date(stats.firstEntryAt).toISOString() : undefined;
            wrap.setChildren(
                buildStat("rows", formatCount(stats.totalRows)),
                buildStat("size", formatBytes(stats.totalBytes)),
                buildStat("dbs", formatCount(stats.totalDbs)),
                buildStat("since", formatSince(stats.firstEntryAt), sinceTitle),
            );
        },
    };
}
