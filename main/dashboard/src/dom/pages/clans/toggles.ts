import { button, div, type Instance } from "../../factory";
import type { ClanRosterMember } from "../../../state/clans/clans-client/index.js";
import { sortMembersByHierarchy, type ClanRankLadder } from "../../../state/icons/rank-sort.js";
import type { RosterSort, RosterView } from "../../../state/clans/roster/prefs.js";
import {
    CLAN_VIEW_BTN_ACTIVE_CLASS,
    CLAN_VIEW_BTN_CLASS,
    CLAN_VIEW_TOGGLE_CLASS,
} from "../../../shared/constants/clan-page-constants.js";

export function buildViewToggle(current: RosterView, onChange: (v: RosterView) => void): Instance {
    const gridBtn = button({
        classes: [CLAN_VIEW_BTN_CLASS],
        text: "Grid",
        context: "show the roster as a grid",
        meta: ["action"],
        onClick: () => {
            apply("grid");
            onChange("grid");
        },
    });
    const listBtn = button({
        classes: [CLAN_VIEW_BTN_CLASS],
        text: "List",
        context: "show the roster as a list",
        meta: ["action"],
        onClick: () => {
            apply("list");
            onChange("list");
        },
    });
    const apply = (v: RosterView): void => {
        gridBtn.toggleClass(CLAN_VIEW_BTN_ACTIVE_CLASS, v === "grid");
        listBtn.toggleClass(CLAN_VIEW_BTN_ACTIVE_CLASS, v === "list");
    };
    apply(current);
    return div({ classes: [CLAN_VIEW_TOGGLE_CLASS], context: null, meta: null }, [gridBtn, listBtn]);
}

export function buildSortToggle(current: RosterSort, onChange: (v: RosterSort) => void): Instance {
    const opts: { value: RosterSort; label: string }[] = [
        { value: "hierarchy", label: "Hierarchy" },
        { value: "joined", label: "Join date" },
    ];
    const btns = opts.map((o) =>
        button({
            classes: [CLAN_VIEW_BTN_CLASS],
            text: o.label,
            context: `sort the roster by ${o.label}`,
            meta: ["choice"],
            onClick: () => {
                apply(o.value);
                onChange(o.value);
            },
        }),
    );
    const apply = (v: RosterSort): void => {
        opts.forEach((o, i) => btns[i].toggleClass(CLAN_VIEW_BTN_ACTIVE_CLASS, o.value === v));
    };
    apply(current);
    return div({ classes: [CLAN_VIEW_TOGGLE_CLASS], context: null, meta: null }, btns);
}

function rosterNameKey(m: ClanRosterMember): string {
    return m.name;
}

function sortByJoinedAt(members: ClanRosterMember[]): ClanRosterMember[] {
    return [...members].sort((a, b) => {
        const aJoined = a.joinedAt ?? "";
        const bJoined = b.joinedAt ?? "";
        if (aJoined === "" && bJoined === "") return a.name.localeCompare(b.name);
        if (aJoined === "") return 1;
        if (bJoined === "") return -1;
        const cmp = aJoined.localeCompare(bJoined);
        if (cmp !== 0) return cmp;
        return a.name.localeCompare(b.name);
    });
}

export function applySort(members: ClanRosterMember[], sort: RosterSort, ladder: ClanRankLadder): ClanRosterMember[] {
    if (sort === "joined") return sortByJoinedAt(members);
    return sortMembersByHierarchy(members, ladder, rosterNameKey);
}
