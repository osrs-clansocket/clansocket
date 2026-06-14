import { div } from "../../factory/layout-ops";
import { span } from "../../factory/content-ops";
import { image } from "../../factory/content-ops/graphics/media.js";
import { effect, type ReadSignal, type Signal } from "../../factory/reactive";
import type { Instance } from "../../factory/core";
import { isPositionActive, type PositionsState } from "../../../state/clans/stores/positions-store.js";
import { rsnTag } from "../../factory/data-ops/rsn-tag.js";
import { iconLabel, ICON_LABEL_SIZE_SM } from "../../factory/data-ops/icon-label.js";
import { viewportToComposite } from "./paint/calculators/viewport-calculator.js";
import type { BlipPositionAnimator } from "./paint/animators/blip-position-animator.js";
import type { AtlasBox } from "../../../shared/types/clan-map-view-types.js";

const BLIP_COLOR = "#ff5252";

export interface ClanMapNamesProps {
    positions$: ReadSignal<PositionsState>;
    viewport$: ReadSignal<AtlasBox>;
    canvasDims$: ReadSignal<{ w: number; h: number }>;
    activePlane$: ReadSignal<number>;
    visible$: Signal<boolean>;
    lastKnownVisible$: ReadSignal<boolean>;
    hoveredBlipHash$: ReadSignal<string | null>;
    paintTick$: ReadSignal<number>;
    blipAnimator: BlipPositionAnimator;
}

const ENGAGED_MS = 4000;
const HP_ICON_NAME = "osrs-sprite_skill_hitpoints";
const PRAYER_ICON_NAME = "osrs-sprite_skill_prayer";
const ATTACK_ICON_NAME = "osrs-hiscores_attack";

export function prayerSpriteSrc(name: string): string {
    const lower = name.toLowerCase();
    let slug = "";
    let lastUnderscore = true;
    for (const ch of lower) {
        const isAlphaNum = (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");
        if (isAlphaNum) {
            slug += ch;
            lastUnderscore = false;
        } else if (!lastUnderscore) {
            slug += "_";
            lastUnderscore = true;
        }
    }
    if (slug.endsWith("_")) slug = slug.slice(0, -1);
    return `/resources/osrs/game_prayer/${slug}.webp`;
}

interface CardRefs {
    instance: Instance;
    rail: Instance;
    regionEl: HTMLElement;
    hpEl: HTMLElement;
    prayerEl: HTMLElement;
    combatInst: Instance;
    combatIcon: Instance;
    combatNameInst: Instance;
    combatDmgInst: Instance;
    prayersInst: Instance;
    prayerImgs: Map<string, Instance>;
}

function buildVitalsRow(): { row: Instance; hpEl: HTMLElement; prayerEl: HTMLElement } {
    const hpPair = iconLabel({ name: HP_ICON_NAME, alt: "HP", size: ICON_LABEL_SIZE_SM, context: null, meta: null });
    const prayerPair = iconLabel({
        name: PRAYER_ICON_NAME,
        alt: "Prayer",
        size: ICON_LABEL_SIZE_SM,
        context: null,
        meta: null,
    });
    const row = div({ classes: ["clan-map__name-card-vitals"], context: null, meta: null }, [
        hpPair.instance,
        prayerPair.instance,
    ]);
    return { row, hpEl: hpPair.labelInst.el, prayerEl: prayerPair.labelInst.el };
}

function buildCard(rsn: string): CardRefs {
    const rail = div({ classes: ["clan-map__name-card-rail"], context: null, meta: null });
    rail.el.style.background = BLIP_COLOR;
    const nameInst = rsnTag({ rsn, size: "sm", classes: ["clan-map__name-card-name"], context: null, meta: null });
    const regionSpan = span({ classes: ["clan-map__name-card-region"], context: null, meta: null });
    const vitals = buildVitalsRow();
    const prayersInst = div({ classes: ["clan-map__name-card-prayers"], context: null, meta: null });
    const combatDmgInst = span({ classes: ["clan-map__name-card-entry-dmg"], context: null, meta: null });
    combatDmgInst.el.style.color = BLIP_COLOR;
    const combatPair = iconLabel({
        name: ATTACK_ICON_NAME,
        alt: "attack",
        size: ICON_LABEL_SIZE_SM,
        classes: ["clan-map__name-card-entry"],
        labelClasses: ["clan-map__name-card-entry-name"],
        trailing: combatDmgInst,
        context: null,
        meta: null,
    });
    const combatInst = div({ classes: ["clan-map__name-card-combat"], context: null, meta: null }, [
        combatPair.instance,
    ]);
    const body = div({ classes: ["clan-map__name-card-body"], context: null, meta: null }, [
        nameInst,
        vitals.row,
        prayersInst,
        combatInst,
        regionSpan,
    ]);
    const instance = div({ classes: ["clan-map__name-card"], context: null, meta: null }, [rail, body]);
    return {
        instance,
        rail,
        regionEl: regionSpan.el,
        hpEl: vitals.hpEl,
        prayerEl: vitals.prayerEl,
        combatInst,
        combatIcon: combatPair.iconInst,
        combatNameInst: combatPair.labelInst,
        combatDmgInst,
        prayersInst,
        prayerImgs: new Map<string, Instance>(),
    };
}

export interface CombatLine {
    target: string;
    dealt: number | null;
}

function patchCombat(card: CardRefs, line: CombatLine | null): void {
    if (line === null) {
        card.combatNameInst.setText("");
        card.combatDmgInst.setText("");
        card.combatDmgInst.el.style.display = "none";
        card.combatIcon.el.style.display = "none";
        return;
    }
    card.combatNameInst.setText(line.target);
    const hasDmg = line.dealt !== null;
    if (hasDmg) {
        card.combatDmgInst.setText(`−${line.dealt ?? 0}`);
        card.combatDmgInst.el.style.display = "";
        card.combatIcon.el.style.display = "";
    } else {
        card.combatDmgInst.setText("");
        card.combatDmgInst.el.style.display = "none";
        card.combatIcon.el.style.display = "none";
    }
}

interface CombatAccum {
    target: string;
    lastDealtAt: number;
    totalDealt: number;
    interactingId: number | null;
    multipleKills: boolean;
}

const combatAccumulators = new Map<string, CombatAccum>();

export function combatLines(
    row: import("../../../state/clans/stores/positions-store.js").PositionRow,
    nowMs: number,
): CombatLine[] {
    if (row.interacting_name === null || row.interacting_name.length === 0) {
        combatAccumulators.delete(row.account_hash);
        return [];
    }
    const dealtAt = row.last_damage_dealt_at;
    const takenAt = row.last_damage_taken_at;
    const recent = (t: number | null): boolean => t !== null && nowMs - t < ENGAGED_MS;
    if (!recent(dealtAt) && !recent(takenAt)) {
        combatAccumulators.delete(row.account_hash);
        return [];
    }
    let accum = combatAccumulators.get(row.account_hash);
    if (accum !== undefined && accum.target !== row.interacting_name) {
        combatAccumulators.delete(row.account_hash);
        accum = undefined;
    }
    if (accum === undefined) {
        accum = {
            target: row.interacting_name,
            lastDealtAt: 0,
            totalDealt: 0,
            interactingId: row.interacting_id,
            multipleKills: false,
        };
        combatAccumulators.set(row.account_hash, accum);
    } else if (
        row.interacting_id !== null &&
        accum.interactingId !== null &&
        row.interacting_id !== accum.interactingId
    ) {
        accum.multipleKills = true;
        accum.interactingId = row.interacting_id;
    } else if (row.interacting_id !== null && accum.interactingId === null) {
        accum.interactingId = row.interacting_id;
    }
    if (recent(dealtAt) && dealtAt !== null && dealtAt > accum.lastDealtAt) {
        accum.totalDealt += row.last_damage_dealt_amount ?? 0;
        accum.lastDealtAt = dealtAt;
    }
    const label = accum.multipleKills ? `${accum.target}'s` : accum.target;
    return [{ target: label, dealt: accum.totalDealt > 0 ? accum.totalDealt : null }];
}

function syncPrayerImages(card: CardRefs, active: readonly string[]): void {
    const wanted = new Set(active);
    for (const [name, inst] of card.prayerImgs) {
        if (!wanted.has(name)) {
            inst.detach();
            card.prayerImgs.delete(name);
        }
    }
    for (const name of active) {
        if (card.prayerImgs.has(name)) continue;
        const inst = image({
            src: prayerSpriteSrc(name),
            alt: name,
            title: name,
            classes: ["clan-map__name-card-prayer-icon"],
            lazy: false,
            context: null,
            meta: null,
        });
        card.prayerImgs.set(name, inst);
        card.prayersInst.addChild(inst);
    }
}

export function clanMapNames(props: ClanMapNamesProps): Instance {
    const root = div({ classes: ["clan-map__names"], context: "clan name overlay", meta: null });
    const pool = new Map<string, CardRefs>();

    effect(() => {
        const visible = props.visible$();
        root.el.classList.toggle("is-hidden", !visible);
        if (!visible) return;
        const ps = props.positions$();
        const vp = props.viewport$();
        const dims = props.canvasDims$();
        const plane = props.activePlane$();
        const showLastKnown = props.lastKnownVisible$();
        props.paintTick$();
        if (ps.mapMeta === null) return;
        const view = viewportToComposite(vp, dims.w, dims.h);
        const dpr = window.devicePixelRatio || 1;
        const perfNowMs = performance.now();
        const live = new Set<string>();
        for (const row of ps.byHash.values()) {
            if (row.location_plane !== plane) continue;
            if (!showLastKnown && !isPositionActive(row)) continue;
            live.add(row.account_hash);
            const interp = props.blipAnimator.getInterpolated(row.account_hash, perfNowMs);
            const worldX = interp === null ? row.location_x : interp.x;
            const worldY = interp === null ? row.location_y : interp.y;
            const ix = (worldX - ps.mapMeta.origin_world_x) * ps.mapMeta.pixels_per_tile;
            const iy = (ps.mapMeta.top_world_y - worldY) * ps.mapMeta.pixels_per_tile;
            const px = (ix * view.scale + view.offsetX) / dpr;
            const py = (iy * view.scale + view.offsetY) / dpr;
            let card = pool.get(row.account_hash);
            if (card === undefined) {
                card = buildCard(row.latest_rsn);
                pool.set(row.account_hash, card);
                root.addChild(card.instance);
            }
            card.regionEl.textContent = row.location_region_name || "—";
            card.hpEl.textContent = `${row.hitpoints}/${row.max_hitpoints}`;
            card.prayerEl.textContent = `${row.prayer}/${row.max_prayer}`;
            const lines = combatLines(row, Date.now());
            const line = lines.length > 0 ? lines[0] : null;
            patchCombat(card, line);
            card.instance.el.classList.toggle("has-combat", line !== null);
            syncPrayerImages(card, row.active_prayers);
            card.instance.el.style.left = `${px}px`;
            card.instance.el.style.top = `${py}px`;
        }
        for (const [hash, card] of pool) {
            if (!live.has(hash)) {
                card.instance.el.remove();
                pool.delete(hash);
            }
        }
    });

    effect(() => {
        const hovered = props.hoveredBlipHash$();
        for (const [hash, card] of pool) {
            card.instance.el.classList.toggle("is-hovered", hash === hovered);
        }
    });

    return root;
}
