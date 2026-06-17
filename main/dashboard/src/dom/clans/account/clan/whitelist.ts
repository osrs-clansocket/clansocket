import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    effect,
    heading,
    image,
    paragraph,
    slidePanel,
    span,
    type Child,
    type Instance,
    type SlidePanelInstance,
} from "../../../factory";
import { clansClient, type ManagedClan } from "../../../../state/clans/clans-client/index.js";
import { rankIconPath } from "../../../../state/icons/rank-icons.js";
import { sortRanksByHierarchy } from "../../../../state/icons/rank-sort.js";
import { createWhitelistStore, type WhitelistData } from "../../../../state/clans/stores/whitelist-store.js";
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

interface RankPoolEntry {
    inst: Instance;
    btn: Instance;
    rebuildKey: string;
}

// Token-bound typography helpers: title / message / actions bind via inline
// style with CSS variables so the elements have explicit font tiers rather
// than falling back to browser-default <h3> / <p> sizing.
function buildPanelTitle(text: string): Instance {
    const inst = span({ classes: [], text, context: null, meta: null });
    inst.el.style.display = "block";
    inst.el.style.fontSize = "var(--fs-sm)";
    inst.el.style.fontWeight = "var(--fw-semi)";
    inst.el.style.color = "var(--base-gold-300)";
    inst.el.style.lineHeight = "var(--lh-tight)";
    return inst;
}

function buildPanelMessage(text: string): Instance {
    const inst = paragraph({ classes: [], text, context: null, meta: null });
    inst.el.style.fontSize = "var(--fs-sm)";
    inst.el.style.lineHeight = "var(--lh-normal)";
    inst.el.style.color = "var(--base-graphite-300)";
    inst.el.style.margin = "0";
    return inst;
}

function buildPanelActions(children: Child[]): Instance {
    const inst = div({ classes: [], context: null, meta: null }, children);
    inst.el.style.display = "flex";
    inst.el.style.flexDirection = "column";
    inst.el.style.gap = "var(--sp-2)";
    return inst;
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

function buildLockedRankButton(rank: string): RankPoolEntry {
    const btn = button(
        {
            classes: [ACCOUNT_BRANDING_ICON_CLASS, ACCOUNT_RANK_ICON_BTN_CLASS, ACCOUNT_RANK_ICON_BTN_LOCKED_CLASS],
            ariaLabel: rank,
            title: rank,
            context: "toggle the manager-access whitelist for this rank",
            meta: ["action", "clan"],
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
    return { inst: btn, btn, rebuildKey: "locked" };
}

function buildAddRankButton(slug: string, rank: string, refresh: () => Promise<void>): RankPoolEntry {
    const btn = button(
        {
            classes: [ACCOUNT_BRANDING_ICON_CLASS, ACCOUNT_RANK_ICON_BTN_CLASS],
            ariaLabel: rank,
            title: rank,
            context: "toggle the manager-access whitelist for this rank",
            meta: ["action", "clan"],
            onClick: async (): Promise<void> => {
                await clansClient.addWhitelistRank(slug, rank, null);
                await refresh();
            },
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
    return { inst: btn, btn, rebuildKey: "add" };
}

function buildRevokeRankButton(
    slug: string,
    rank: string,
    entryId: string,
    refresh: () => Promise<void>,
): RankPoolEntry {
    const triggerBtn = button(
        {
            classes: [ACCOUNT_BRANDING_ICON_CLASS, ACCOUNT_RANK_ICON_BTN_CLASS],
            ariaLabel: rank,
            title: rank,
            context: "toggle the manager-access whitelist for this rank",
            meta: ["action", "clan"],
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

    const panelHost = div({ classes: [], context: null, meta: null });
    let slidePanelInst: SlidePanelInstance | null = null;

    function renderPanelContent(): void {
        panelHost.setChildren(
            buildPanelTitle("Revoke rank whitelist"),
            buildPanelMessage(
                `Remove "${rank}" from the manager-rank whitelist? Plugin sessions with this rank lose manager access until u re-whitelist them or they get approved by existing managers.`,
            ),
            buildPanelActions([
                button({
                    variant: BTN_VARIANT_OUTLINE,
                    compact: true,
                    text: "Cancel",
                    context: `keep ${rank} whitelisted`,
                    meta: ["action"],
                    onClick: () => slidePanelInst?.close(),
                }),
                button({
                    variant: BTN_VARIANT_OUTLINE,
                    compact: true,
                    text: "Revoke",
                    context: `confirm revoking ${rank} from the whitelist`,
                    meta: ["destructive"],
                    onClick: async (): Promise<void> => {
                        slidePanelInst?.close();
                        await clansClient.revokeWhitelistEntry(slug, entryId);
                        await refresh();
                    },
                }),
            ]),
        );
    }

    slidePanelInst = slidePanel(
        {
            onOpen: renderPanelContent,
            onClose: () => panelHost.clear(),
            context: null,
            meta: null,
        },
        triggerBtn,
        panelHost,
    );

    return { inst: slidePanelInst, btn: triggerBtn, rebuildKey: `revoke:${entryId}` };
}

function buildRankEntry(slug: string, rank: string, dataRef: RankDataRef, refresh: () => Promise<void>): RankPoolEntry {
    if (isOwnerOrDeputy(rank)) {
        return buildLockedRankButton(rank);
    }
    const entryId = dataRef.activeByRank.get(rank);
    if (entryId !== undefined) {
        return buildRevokeRankButton(slug, rank, entryId, refresh);
    }
    return buildAddRankButton(slug, rank, refresh);
}

function rebuildKeyFor(rank: string, dataRef: RankDataRef): string {
    if (isOwnerOrDeputy(rank)) return "locked";
    const entryId = dataRef.activeByRank.get(rank);
    return entryId !== undefined ? `revoke:${entryId}` : "add";
}

function patchRankEntry(entry: RankPoolEntry, rank: string, dataRef: RankDataRef): void {
    const isOwnerDeputy = isOwnerOrDeputy(rank);
    const isWhitelisted = dataRef.activeByRank.has(rank);
    const isActive = isWhitelisted || isOwnerDeputy;
    entry.btn.el.classList.toggle(ACCOUNT_BRANDING_ICON_ACTIVE_CLASS, isActive);
    const titleSuffix = isOwnerDeputy ? " (claim rank — locked)" : isWhitelisted ? " (whitelisted)" : "";
    entry.btn.el.title = `${rank}${titleSuffix}`;
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
    const entryPool = new Map<string, RankPoolEntry>();
    const root = panelShell(grid, empty);
    root.trackDispose(
        effect(() => {
            const data = store.data$();
            const members = data.summary?.roster?.members ?? [];
            const next = new Map<string, string>();
            for (const e of data.entries) next.set(e.value, e.id);
            dataRef.activeByRank = next;
            if (members.length === 0) {
                for (const entry of entryPool.values()) entry.inst.destroy();
                entryPool.clear();
                empty.el.hidden = false;
                return;
            }
            const sortedRanks = computeSortedRanks(data, dataRef);
            const live = new Set(sortedRanks);
            for (const r of sortedRanks) {
                const wantKey = rebuildKeyFor(r, dataRef);
                const cached = entryPool.get(r);
                if (cached !== undefined && cached.rebuildKey !== wantKey) {
                    cached.inst.destroy();
                    entryPool.delete(r);
                }
                if (!entryPool.has(r)) {
                    entryPool.set(r, buildRankEntry(clan.slug, r, dataRef, refresh));
                }
                patchRankEntry(entryPool.get(r)!, r, dataRef);
            }
            for (const [r, entry] of entryPool) {
                if (!live.has(r)) {
                    entry.inst.destroy();
                    entryPool.delete(r);
                }
            }
            let nextEl: ChildNode | null = grid.el.firstChild;
            for (const r of sortedRanks) {
                const entry = entryPool.get(r);
                if (entry === undefined) continue;
                if (entry.inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
                else grid.addBefore(entry.inst, nextEl);
            }
            empty.el.hidden = sortedRanks.length > 0;
        }),
    );
    return root;
}
