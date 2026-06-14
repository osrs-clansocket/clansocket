import { div, icon, image, snapshot, span, type Instance } from "../../factory";
import type { ClanRosterMember } from "../../../state/clans/clans-client/index.js";
import { rankColorClass, rankIconPath } from "../../../state/icons/rank-icons.js";
import { fmtJoined } from "../../../state/clans/roster/format.js";
import {
    CLAN_PLUGIN_BADGE_CLASS,
    CLAN_PLUGIN_BADGE_LIVE_CLASS,
    CLAN_ROSTER_CARD_CLASS,
    CLAN_ROSTER_CARD_JOINED_CLASS,
    CLAN_ROSTER_CARD_RANK_CLASS,
    CLAN_ROSTER_CARD_RSN_CLASS,
    CLAN_ROSTER_GRID_CLASS,
    CLAN_ROSTER_JOINED_CLASS,
    CLAN_ROSTER_LIST_CLASS,
    CLAN_ROSTER_NAME_CLASS,
    CLAN_ROSTER_NAME_WRAP_CLASS,
    CLAN_ROSTER_RANK_CLASS,
    CLAN_ROSTER_RANK_ICON_CLASS,
    CLAN_ROSTER_RANK_ICON_EMPTY_CLASS,
    CLAN_ROSTER_RANK_ICON_LG_CLASS,
    CLAN_ROSTER_ROW_CLASS,
} from "../../../shared/constants/clan-page-constants.js";

function buildRankIcon(rank: string | null, large: boolean): Instance {
    const cls = large ? CLAN_ROSTER_RANK_ICON_LG_CLASS : CLAN_ROSTER_RANK_ICON_CLASS;
    if (rank === null || rank.length === 0) {
        return span({ classes: [cls, CLAN_ROSTER_RANK_ICON_EMPTY_CLASS], context: null, meta: null });
    }
    return image({ src: rankIconPath(rank), alt: rank, title: rank, classes: [cls], context: null, meta: null });
}

function buildPluginBadge(m: ClanRosterMember): Instance | null {
    if (m.hasPlugin !== true) return null;
    const title = m.isLive === true ? "streaming via plugin" : "has plugin installed";
    const classes = [CLAN_PLUGIN_BADGE_CLASS];
    if (m.isLive === true) classes.push(CLAN_PLUGIN_BADGE_LIVE_CLASS);
    return icon({
        name: "plug-fill",
        classes,
        context: null,
        meta: null,
        effects: m.isLive === true ? ["pulse-live"] : undefined,
    })
        .setAttr("title", title)
        .setAttr("aria-label", title);
}

function buildNameWithBadge(m: ClanRosterMember, nameCls: string): Instance {
    const children: Instance[] = [span({ classes: [nameCls], text: m.name, context: null, meta: null })];
    const badge = buildPluginBadge(m);
    if (badge) children.push(badge);
    return span({ classes: [CLAN_ROSTER_NAME_WRAP_CLASS], context: null, meta: null }, children);
}

function classesWith(base: string, rank: string | null): string[] {
    const accent = rankColorClass(rank);
    return accent === null ? [base] : [base, accent];
}

function buildRosterRow(m: ClanRosterMember): Instance {
    return div({ classes: classesWith(CLAN_ROSTER_ROW_CLASS, m.rank), context: null, meta: null }, [
        buildRankIcon(m.rank, false),
        buildNameWithBadge(m, CLAN_ROSTER_NAME_CLASS),
        span({ classes: [CLAN_ROSTER_RANK_CLASS], text: m.rank ?? "", context: null, meta: null }),
        span({ classes: [CLAN_ROSTER_JOINED_CLASS], text: snapshot(fmtJoined(m.joinedAt)), context: null, meta: null }),
    ]);
}

function buildRosterCard(m: ClanRosterMember): Instance {
    return div({ classes: classesWith(CLAN_ROSTER_CARD_CLASS, m.rank), context: null, meta: null }, [
        buildRankIcon(m.rank, true),
        buildNameWithBadge(m, CLAN_ROSTER_CARD_RSN_CLASS),
        span({ classes: [CLAN_ROSTER_CARD_RANK_CLASS], text: m.rank ?? "", context: null, meta: null }),
        span({
            classes: [CLAN_ROSTER_CARD_JOINED_CLASS],
            text: snapshot(fmtJoined(m.joinedAt)),
            context: null,
            meta: null,
        }),
    ]);
}

export function buildRosterList(members: ClanRosterMember[]): Instance {
    return div({ classes: [CLAN_ROSTER_LIST_CLASS], context: null, meta: null }, members.map(buildRosterRow));
}

export function buildRosterGrid(members: ClanRosterMember[]): Instance {
    return div({ classes: [CLAN_ROSTER_GRID_CLASS], context: null, meta: null }, members.map(buildRosterCard));
}
