import {
    BTN_VARIANT_OUTLINE,
    button,
    clanAvatarInner,
    createInstance,
    div,
    effect,
    heading,
    image,
    paragraph,
    span,
    type Instance,
} from "../../../factory";
import type { ClanIconKind, ManagedClan } from "../../../../state/clans/clans-client/index.js";
import { identificationStore } from "../../../../state/identity/stores/identification-store.js";
import { rankIconPath } from "../../../../state/icons/rank-icons.js";
import { AppEvents, events, type ClanBrandingChangedPayload } from "../../../../managers/events";
import { buildClanDetails } from "./clan-details";
import {
    ACCOUNT_CLAN_AVATAR_CLASS,
    ACCOUNT_CLAN_AVATAR_GLYPH_CLASS,
    ACCOUNT_CLAN_AVATAR_IMG_CLASS,
    ACCOUNT_CLAN_CHEVRON_CLASS,
    ACCOUNT_CLAN_DETAILS_CLASS,
    ACCOUNT_CLAN_LIST_CLASS,
    ACCOUNT_CLAN_NAME_CLASS,
    ACCOUNT_CLAN_ROW_BADGE_CLASS,
    ACCOUNT_CLAN_ROW_BADGE_ICON_CLASS,
    ACCOUNT_CLAN_ROW_BADGE_LABEL_CLASS,
    ACCOUNT_CLAN_ROW_BANNER_CLASS,
    ACCOUNT_CLAN_ROW_CLASS,
    ACCOUNT_CLAN_ROW_HEAD_CLASS,
    ACCOUNT_CLAN_ROW_HEAD_STATIC_CLASS,
    ACCOUNT_CLAN_ROW_INFO_CLASS,
    ACCOUNT_CLAN_ROW_INFO_ITEM_CLASS,
    ACCOUNT_CLAN_ROW_OPEN_CLASS,
    ACCOUNT_CLAN_ROW_VIEW_CLASS,
    ACCOUNT_EMPTY_CLASS,
} from "../../../../shared/constants/account-constants.js";

const OPEN_CLAN_KEY = "clansocket:account-open-clan";
const MEMBER_ROLE = "member";
const UNKNOWN_RANK = "—";
const FALLBACK_RANK_ICON_SRC = "/resources/clan/static_logo.webp";

function readOpenSlug(): string | null {
    try {
        return window.sessionStorage.getItem(OPEN_CLAN_KEY);
    } catch {
        return null;
    }
}

function writeOpenSlug(slug: string | null): void {
    try {
        if (slug === null) window.sessionStorage.removeItem(OPEN_CLAN_KEY);
        else window.sessionStorage.setItem(OPEN_CLAN_KEY, slug);
    } catch {
        return;
    }
}

interface ClanAvatarOpts {
    slug: string;
    iconKind: ClanIconKind | null;
    iconValue: string | null;
    color: string | null;
    imageVersion?: number;
}

function buildClanAvatar({ slug, iconKind, iconValue, color, imageVersion }: ClanAvatarOpts): Instance {
    const avatar = span({ classes: [ACCOUNT_CLAN_AVATAR_CLASS], context: null, meta: null });
    if (color) avatar.el.style.setProperty("--clan-accent", color);
    avatar.addChild(
        clanAvatarInner({
            slug,
            iconKind,
            iconValue,
            imageVersion: imageVersion ?? Date.now(),
            imgClass: ACCOUNT_CLAN_AVATAR_IMG_CLASS,
            glyphClass: ACCOUNT_CLAN_AVATAR_GLYPH_CLASS,
            context: null,
            meta: null,
        }),
    );
    return avatar;
}

function findUserRank(): string {
    const id = identificationStore.identification$();
    if (!id) return UNKNOWN_RANK;
    for (const v of id.verifiedRsns) {
        if (v.rank) return v.rank;
    }
    return UNKNOWN_RANK;
}

function applyRankToBadgeInPlace(iconEl: HTMLImageElement, labelEl: HTMLSpanElement, rank: string): void {
    const hasRank = rank !== UNKNOWN_RANK && rank.length > 0;
    const nextSrc = hasRank ? rankIconPath(rank) : FALLBACK_RANK_ICON_SRC;
    if (iconEl.src.endsWith(nextSrc)) {
        // already showing this rank — no-op avoids any browser-side reflow
    } else {
        iconEl.src = nextSrc;
    }
    iconEl.alt = hasRank ? rank : "Unknown rank";
    iconEl.title = hasRank ? rank : "Rank unknown";
    labelEl.textContent = hasRank ? rank : UNKNOWN_RANK;
}

function buildInfoItem(text: string): Instance {
    return span({ classes: [ACCOUNT_CLAN_ROW_INFO_ITEM_CLASS], text, context: null, meta: null });
}

function buildInfo(clan: ManagedClan): Instance {
    const memberCount = clan.roster?.memberCount ?? 0;
    const members = clan.roster?.members ?? [];
    const liveCount = members.filter((m) => m.isLive === true).length;
    const items: Instance[] = [buildInfoItem(`${memberCount} members`)];
    if (liveCount > 0) items.push(buildInfoItem(`${liveCount} live`));
    return div({ classes: [ACCOUNT_CLAN_ROW_INFO_CLASS], context: null, meta: null }, items);
}

function buildRankBadge(): Instance {
    const icon = image({
        src: FALLBACK_RANK_ICON_SRC,
        alt: "Loading rank",
        title: "Loading rank",
        classes: [ACCOUNT_CLAN_ROW_BADGE_ICON_CLASS],
        context: null,
        meta: null,
    });
    const label = span({
        classes: [ACCOUNT_CLAN_ROW_BADGE_LABEL_CLASS],
        text: UNKNOWN_RANK,
        context: null,
        meta: null,
    });
    const badge = span({ classes: [ACCOUNT_CLAN_ROW_BADGE_CLASS], context: null, meta: null }, [icon, label]);
    const dispose = effect(() => {
        const rank = findUserRank();
        applyRankToBadgeInPlace(icon.el, label.el, rank);
    });
    badge.trackDispose(dispose);
    return badge;
}

function buildHeadChildren(clan: ManagedClan, isManager: boolean): Instance[] {
    const avatar = buildClanAvatar({
        slug: clan.slug,
        iconKind: clan.iconKind,
        iconValue: clan.iconValue,
        color: clan.color,
    });
    const name = heading("h3", {
        classes: [ACCOUNT_CLAN_NAME_CLASS],
        text: clan.displayName,
        context: null,
        meta: null,
    });
    const info = buildInfo(clan);
    const badge = buildRankBadge();
    const children: Instance[] = [avatar, name, info, badge];
    if (isManager) {
        children.push(span({ classes: [ACCOUNT_CLAN_CHEVRON_CLASS], text: "▾", context: null, meta: null }));
    }
    return children;
}

function buildClanRow(clan: ManagedClan, onToggle: (row: HTMLElement) => void): Instance {
    const isManager = clan.role !== MEMBER_ROLE;
    const headChildren = buildHeadChildren(clan, isManager);
    const head: Instance = isManager
        ? button(
              {
                  classes: [ACCOUNT_CLAN_ROW_HEAD_CLASS],
                  context: "expand or collapse this clan's management details",
                  meta: ["disclosure", "clan"],
                  onClick: () => onToggle(row.el),
              },
              headChildren,
          )
        : div(
              {
                  classes: [ACCOUNT_CLAN_ROW_HEAD_CLASS, ACCOUNT_CLAN_ROW_HEAD_STATIC_CLASS],
                  context: null,
                  meta: null,
              },
              headChildren,
          );

    const viewBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        classes: [ACCOUNT_CLAN_ROW_VIEW_CLASS],
        text: "View",
        context: "open this clan's public page",
        meta: ["nav", "clan"],
        onClick: () => {
            window.location.assign(`/clans/${clan.slug}`);
        },
    });

    const banner = div({ classes: [ACCOUNT_CLAN_ROW_BANNER_CLASS], context: null, meta: null }, [head, viewBtn]);
    const row = div({ classes: [ACCOUNT_CLAN_ROW_CLASS], context: null, meta: null }, [banner]);

    const onBranding = (...args: unknown[]): void => {
        const payload = args[0] as ClanBrandingChangedPayload | undefined;
        if (!payload || payload.slug !== clan.slug) return;
        const next = buildClanAvatar({
            slug: clan.slug,
            iconKind: payload.iconKind,
            iconValue: payload.iconValue,
            color: payload.color,
            imageVersion: payload.imageVersion,
        });
        const existing = head.el.querySelector(`.${ACCOUNT_CLAN_AVATAR_CLASS}`);
        if (existing) existing.replaceWith(next.el);
    };
    events.on(AppEvents.CLAN_BRANDING_CHANGED, onBranding);

    return row;
}

export function buildClanList(items: ManagedClan[]): { list: Instance; empty: Instance } {
    const list = div({ classes: [ACCOUNT_CLAN_LIST_CLASS], context: null, meta: null });
    const empty = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], text: "No clans.", context: null, meta: null });

    if (items.length === 0) {
        empty.el.hidden = false;
        return { list, empty };
    }
    empty.el.hidden = true;

    let openRow: HTMLElement | null = null;
    const rows: Instance[] = [];
    const rowsByClan = new Map<string, { row: Instance; clan: ManagedClan }>();
    for (const clan of items) {
        const row = buildClanRow(clan, (target) =>
            toggleClanRow(target, openRow, clan, (next) => {
                openRow = next;
            }),
        );
        rows.push(row);
        rowsByClan.set(clan.slug, { row, clan });
    }
    list.setChildren(...rows);

    const savedSlug = readOpenSlug();
    if (savedSlug !== null) {
        const target = rowsByClan.get(savedSlug);
        if (target && target.clan.role !== MEMBER_ROLE) {
            target.row.el.classList.add(ACCOUNT_CLAN_ROW_OPEN_CLASS);
            createInstance(target.row.el).addChild(buildClanDetails(target.clan));
            openRow = target.row.el;
        } else {
            writeOpenSlug(null);
        }
    }

    return { list, empty };
}

function toggleClanRow(
    target: HTMLElement,
    openRow: HTMLElement | null,
    clan: ManagedClan,
    setOpen: (next: HTMLElement | null) => void,
): void {
    if (openRow === target) {
        target.classList.remove(ACCOUNT_CLAN_ROW_OPEN_CLASS);
        const det = target.querySelector(`.${ACCOUNT_CLAN_DETAILS_CLASS}`);
        if (det) createInstance(det as HTMLElement).destroy();
        setOpen(null);
        writeOpenSlug(null);
        return;
    }
    if (openRow) {
        openRow.classList.remove(ACCOUNT_CLAN_ROW_OPEN_CLASS);
        const det = openRow.querySelector(`.${ACCOUNT_CLAN_DETAILS_CLASS}`);
        if (det) createInstance(det as HTMLElement).destroy();
    }
    target.classList.add(ACCOUNT_CLAN_ROW_OPEN_CLASS);
    createInstance(target).addChild(buildClanDetails(clan));
    setOpen(target);
    writeOpenSlug(clan.slug);
}
