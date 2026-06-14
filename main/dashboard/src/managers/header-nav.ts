import { animateKeyframes, clanAvatarInner, createInstance, derived, effect, snapshot } from "../dom/factory";
import { events } from "./events";
import { router } from "./router";
import { clansStore } from "../state/clans/stores/clans-store.js";
import { type ManagedClan } from "../state/clans/clans-client/index.js";

const ICON_ACTIVE = "dashboard__nav-icon--active";
const ICON_ACCENTED = "dashboard__nav-icon--accented";
const ICON_TEMPLATE = "dashboard__nav-icon--template";
const ARIA_LABEL_ATTR = "aria-label";
const NAV_ROUTE_ATTR = "data-nav-route";
const NAV_ACCENT_VAR = "--nav-icon-accent";
const NAV_GLYPH_SELECTOR = "[data-nav-icon-glyph]";
const NAV_AVATAR_IMG_SELECTOR = ".dashboard__nav-icon-img";
const NAV_AVATAR_IMG_CLASS = "dashboard__nav-icon-img";
const NAV_AVATAR_GLYPH_CLASS = "dashboard__nav-icon-glyph";
const NAV_RAIL_SELECTOR = "[data-nav-rail]";
const NAV_TEMPLATE_SELECTOR = "[data-nav-icon-template]";
const SUBTITLE_SELECTOR = '[data-key="dash-subtitle"]';
const HOME_PATH = "/";
const ROUTE_CHANGE = "route:change";
const MIN_ANIMATE_PX = 0.5;
const FLIP_DURATION_MS = 300;
const FLIP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const FALLBACK_ICON = "bi-shield";

export interface NavPage {
    key: string;
    title: string;
    icon: string;
    route: string;
    iconKind?: "builtin" | "image";
    slug?: string;
    imageVersion?: number;
    color?: string | null;
}

interface IconEntry {
    page: NavPage;
    el: HTMLButtonElement;
    apply(next: NavPage): void;
    destroy(): void;
}

interface HeaderNavOptions {
    headerEl: HTMLElement;
    staticPages: NavPage[];
    isAuthed: boolean;
}

function clanToNavPage(c: ManagedClan): NavPage {
    const isImage = c.iconKind === "image";
    const builtin = c.iconKind === "builtin" && c.iconValue ? c.iconValue : FALLBACK_ICON;
    return {
        key: `clan:${c.slug}`,
        title: c.displayName,
        icon: isImage ? FALLBACK_ICON : builtin,
        route: `/clans/${c.slug}`,
        iconKind: isImage ? "image" : "builtin",
        slug: c.slug,
        imageVersion: c.iconVersion,
        color: c.color,
    };
}

function imageSrcFor(page: NavPage): string {
    const slug = page.slug ?? "";
    const versioned = page.imageVersion !== undefined ? `?v=${page.imageVersion}` : "";
    return `/api/clans/${encodeURIComponent(slug)}/icon${versioned}`;
}

function applyColor(btn: HTMLButtonElement, color: string | null | undefined): void {
    if (color !== null && color !== undefined && color.length > 0) {
        btn.style.setProperty(NAV_ACCENT_VAR, color);
        btn.classList.add(ICON_ACCENTED);
    } else {
        btn.style.removeProperty(NAV_ACCENT_VAR);
        btn.classList.remove(ICON_ACCENTED);
    }
}

function createAvatar(page: NavPage): ReturnType<typeof clanAvatarInner> {
    return clanAvatarInner({
        slug: page.slug,
        iconKind: page.iconKind ?? "builtin",
        iconValue: page.icon,
        imageVersion: page.imageVersion,
        imgClass: NAV_AVATAR_IMG_CLASS,
        glyphClass: NAV_AVATAR_GLYPH_CLASS,
        context: null,
        meta: null,
    });
}

function buildEntry(template: HTMLButtonElement, page: NavPage): IconEntry {
    const btn = template.cloneNode(true) as HTMLButtonElement;
    btn.hidden = false;
    btn.classList.remove(ICON_TEMPLATE);
    const btnInst = createInstance(btn);
    btnInst.setAttr(ARIA_LABEL_ATTR, snapshot(page.title)).setAttr(NAV_ROUTE_ATTR, snapshot(page.route));
    const placeholderGlyph = btn.querySelector<HTMLElement>(NAV_GLYPH_SELECTOR);
    if (placeholderGlyph !== null) createInstance(placeholderGlyph).destroy();
    btnInst.addChild(createAvatar(page));
    applyColor(btn, page.color);

    const entry: IconEntry = {
        page,
        el: btn,
        apply(next: NavPage): void {
            const prev = entry.page;
            if (next.title !== prev.title) btnInst.setAttr(ARIA_LABEL_ATTR, next.title);
            if (next.route !== prev.route) btnInst.setAttr(NAV_ROUTE_ATTR, next.route);
            if (next.color !== prev.color) applyColor(btn, next.color);

            const wasImage = prev.iconKind === "image";
            const isImage = next.iconKind === "image";
            if (wasImage && isImage) {
                const img = btn.querySelector<HTMLImageElement>(NAV_AVATAR_IMG_SELECTOR);
                if (img !== null) {
                    const newSrc = imageSrcFor(next);
                    if (!img.src.endsWith(newSrc)) img.src = newSrc;
                }
            } else if (wasImage !== isImage || next.icon !== prev.icon || next.iconKind !== prev.iconKind) {
                btnInst.clear();
                btnInst.addChild(createAvatar(next));
            }
            entry.page = next;
        },
        destroy(): void {
            btnInst.destroy();
        },
    };
    return entry;
}

function matchIndex(pages: readonly NavPage[], path: string): number {
    const exact = pages.findIndex((p) => p.route === path);
    if (exact !== -1) return exact;
    return pages.findIndex((p) => p.route !== "/" && path.startsWith(`${p.route}/`));
}

export function mountHeaderNav(options: HeaderNavOptions): void {
    const railEl = options.headerEl.querySelector<HTMLElement>(NAV_RAIL_SELECTOR);
    const template = options.headerEl.querySelector<HTMLButtonElement>(NAV_TEMPLATE_SELECTOR);
    if (!railEl || !template) return;
    const railInst = createInstance(railEl);
    const subtitleEl = options.headerEl.querySelector<HTMLElement>(SUBTITLE_SELECTOR);
    const pages$ = derived(() => {
        const clanPages = options.isAuthed ? clansStore.managed$().map(clanToNavPage) : [];
        return [...options.staticPages, ...clanPages];
    });

    const entries = new Map<string, IconEntry>();
    let icons: IconEntry[] = [];
    let activeIdx = -1;

    function applyActive(idx: number): void {
        const n = icons.length;
        if (n === 0 || idx < 0 || idx >= n) return;
        activeIdx = idx;
        const centerSlot = Math.floor(n / 2);
        const beforeLefts: number[] = new Array(n);
        for (let i = 0; i < n; i += 1) beforeLefts[i] = icons[i]!.el.getBoundingClientRect().left;
        for (let slot = 0; slot < n; slot += 1) {
            const pageIdx = (((idx - centerSlot + slot) % n) + n) % n;
            railInst.addChild(icons[pageIdx]!.el);
        }
        for (let i = 0; i < n; i += 1) icons[i]!.el.classList.toggle(ICON_ACTIVE, i === idx);
        const deltas: number[] = new Array(n);
        for (let i = 0; i < n; i += 1) deltas[i] = beforeLefts[i]! - icons[i]!.el.getBoundingClientRect().left;
        for (let i = 0; i < n; i += 1) {
            const entry = icons[i]!;
            const delta = deltas[i]!;
            if (Math.abs(delta) < MIN_ANIMATE_PX) continue;
            animateKeyframes(entry.el, [{ transform: `translateX(${delta}px)` }, { transform: "translateX(0)" }], {
                duration: FLIP_DURATION_MS,
                easing: FLIP_EASING,
                composite: "replace",
            });
        }
        if (subtitleEl !== null) createInstance(subtitleEl).setText(snapshot(icons[idx]!.page.title));
    }

    function attachClick(entry: IconEntry): void {
        entry.el.addEventListener("click", () => {
            const currentIdx = icons.indexOf(entry);
            const direction: "forward" | "backward" = currentIdx >= activeIdx ? "forward" : "backward";
            router.navigate(entry.page.route, direction);
        });
    }

    function sync(pages: readonly NavPage[]): void {
        const newKeys = new Set(pages.map((p) => p.key));
        for (const [key, entry] of entries) {
            if (!newKeys.has(key)) {
                entry.destroy();
                entries.delete(key);
            }
        }
        const next: IconEntry[] = [];
        for (const page of pages) {
            const existing = entries.get(page.key);
            if (existing !== undefined) {
                existing.apply(page);
                next.push(existing);
            } else {
                const entry = buildEntry(template!, page);
                entries.set(page.key, entry);
                attachClick(entry);
                railInst.addChild(entry.el);
                next.push(entry);
            }
        }
        icons = next;
        const path = router.current() || HOME_PATH;
        const idx = matchIndex(pages, path);
        applyActive(idx === -1 ? 0 : idx);
    }

    effect(() => sync(pages$()));

    const onRoute = (...args: unknown[]): void => {
        const path = typeof args[0] === "string" ? args[0] : HOME_PATH;
        const idx = matchIndex(pages$(), path);
        if (idx !== -1 && idx !== activeIdx) applyActive(idx);
    };
    events.on(ROUTE_CHANGE, onRoute);
}
