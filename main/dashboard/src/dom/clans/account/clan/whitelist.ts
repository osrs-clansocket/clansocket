import { button, div, effect, heading, image, paragraph, type Instance } from "../../../factory";
import { clansClient, type ManagedClan } from "../../../../state/clans/clans-client/index.js";
import { rankIconPath } from "../../../../state/icons/rank-icons.js";
import { sortRanksByHierarchy } from "../../../../state/icons/rank-sort.js";
import { createWhitelistStore, type WhitelistData } from "../../../../state/clans/stores/whitelist-store.js";
import { glassConfirm } from "../../../forms/glass/modals/glass-confirm.js";
import {
    ACCOUNT_BRANDING_GRID_CLASS,
    ACCOUNT_BRANDING_ICON_ACTIVE_CLASS,
    ACCOUNT_BRANDING_ICON_CLASS,
    ACCOUNT_CLAN_BRANDING_SECTION_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
    ACCOUNT_RANK_GRID_CLASS,
    ACCOUNT_RANK_ICON_BTN_CLASS,
    ACCOUNT_RANK_ICON_BTN_LOCKED_CLASS,
    ACCOUNT_RANK_ICON_IMG_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
} from "../../../../shared/constants/account-constants.js";

const TIER_OWNER = 0;
const TIER_DEPUTY = 1;
const TIER_WHITELISTED = 2;
const TIER_OTHER = 3;

interface RankDataRef {
    activeByRank: Map<string, string>;
}

function panelShell(grid: Instance, empty: Instance): Instance {
    return div({ classes: [ACCOUNT_CLAN_BRANDING_SECTION_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Rank-whitelist", context: null, meta: null }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: "Auto-grants manager access to any clan member verified with ClanSocket who holds this rank.",
            context: null,
            meta: null,
        }),
        grid,
        empty,
    ]);
}

function isOwnerOrDeputy(rank: string): boolean {
    return rank === "Owner" || rank === "Deputy Owner";
}

function buildRankButton(slug: string, rank: string, dataRef: RankDataRef, refresh: () => Promise<void>): Instance {
    const isOwnerDeputy = isOwnerOrDeputy(rank);
    const classes = [ACCOUNT_BRANDING_ICON_CLASS, ACCOUNT_RANK_ICON_BTN_CLASS];
    if (isOwnerDeputy) classes.push(ACCOUNT_RANK_ICON_BTN_LOCKED_CLASS);
    return button(
        {
            classes,
            ariaLabel: rank,
            title: rank,
            context: "toggle the manager-access whitelist for this rank",
            meta: ["action", "clan"],
            ...(isOwnerDeputy
                ? {}
                : {
                      onClick: async (): Promise<void> => {
                          const entryId = dataRef.activeByRank.get(rank);
                          if (entryId !== undefined) {
                              const confirmed = await glassConfirm({
                                  title: "Revoke rank whitelist",
                                  message: `Remove "${rank}" from the manager-rank whitelist? Plugin sessions with this rank lose manager access until u re-whitelist them or they get approved by existing managers.`,
                                  confirmLabel: "Revoke",
                                  cancelLabel: "Cancel",
                                  danger: true,
                              });
                              if (!confirmed) return;
                              await clansClient.revokeWhitelistEntry(slug, entryId);
                          } else {
                              await clansClient.addWhitelistRank(slug, rank, null);
                          }
                          await refresh();
                      },
                  }),
        },
        [
            image({
                src: rankIconPath(rank),
                alt: rank,
                classes: [ACCOUNT_RANK_ICON_IMG_CLASS],
                context: null,
                meta: null,
            }),
        ],
    );
}

function patchRankButton(btn: Instance, rank: string, dataRef: RankDataRef): void {
    const isOwnerDeputy = isOwnerOrDeputy(rank);
    const isWhitelisted = dataRef.activeByRank.has(rank);
    const isActive = isWhitelisted || isOwnerDeputy;
    btn.el.classList.toggle(ACCOUNT_BRANDING_ICON_ACTIVE_CLASS, isActive);
    const titleSuffix = isOwnerDeputy ? " (claim rank — locked)" : isWhitelisted ? " (whitelisted)" : "";
    btn.el.title = `${rank}${titleSuffix}`;
}

function computeSortedRanks(data: WhitelistData, dataRef: RankDataRef): string[] {
    const ranks = new Set<string>();
    for (const m of data.summary?.roster?.members ?? []) {
        if (m.rank && m.rank.length > 0) ranks.add(m.rank);
    }
    const tierOf = (r: string): number => {
        if (r === "Owner") return TIER_OWNER;
        if (r === "Deputy Owner") return TIER_DEPUTY;
        if (dataRef.activeByRank.has(r)) return TIER_WHITELISTED;
        return TIER_OTHER;
    };
    const fallback = (a: string, b: string): number => {
        const ta = tierOf(a);
        const tb = tierOf(b);
        return ta !== tb ? ta - tb : a.localeCompare(b);
    };
    return sortRanksByHierarchy([...ranks], data.ladder, fallback);
}

export function buildClanWhitelist(clan: ManagedClan): Instance {
    const grid = div({ classes: [ACCOUNT_BRANDING_GRID_CLASS, ACCOUNT_RANK_GRID_CLASS], context: null, meta: null });
    const empty = paragraph({
        classes: [ACCOUNT_EMPTY_CLASS],
        text: "No roster yet. Ranks appear when a plugin in this clan reports its members.",
        context: null,
        meta: null,
    });
    empty.el.hidden = true;
    const store = createWhitelistStore(clan.slug);
    const refresh = (): Promise<void> => store.refresh();
    const dataRef: RankDataRef = { activeByRank: new Map() };
    const buttonPool = new Map<string, Instance>();
    const root = panelShell(grid, empty);
    root.trackDispose(
        effect(() => {
            const data = store.data$();
            const members = data.summary?.roster?.members ?? [];
            const next = new Map<string, string>();
            for (const e of data.entries) next.set(e.value, e.id);
            dataRef.activeByRank = next;
            if (members.length === 0) {
                for (const inst of buttonPool.values()) inst.destroy();
                buttonPool.clear();
                empty.el.hidden = false;
                return;
            }
            const sortedRanks = computeSortedRanks(data, dataRef);
            const live = new Set(sortedRanks);
            for (const r of sortedRanks) {
                if (!buttonPool.has(r)) buttonPool.set(r, buildRankButton(clan.slug, r, dataRef, refresh));
                patchRankButton(buttonPool.get(r)!, r, dataRef);
            }
            for (const [r, inst] of buttonPool) {
                if (!live.has(r)) {
                    inst.destroy();
                    buttonPool.delete(r);
                }
            }
            let nextEl: ChildNode | null = grid.el.firstChild;
            for (const r of sortedRanks) {
                const inst = buttonPool.get(r);
                if (inst === undefined) continue;
                if (inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
                else grid.addBefore(inst, nextEl);
            }
            empty.el.hidden = sortedRanks.length > 0;
        }),
    );
    return root;
}
