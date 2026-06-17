import type { RouteSeoData, RouteSeoResolver } from "../../../managers/router/types.js";

const BRAND_PREFIX = "ClanSocket - ";
const HOME_PATH = "/";
const SITE_ORIGIN = "https://clansocket.com";
const ROBOTS_INDEX = "index, follow";
const ROBOTS_NOINDEX = "noindex, nofollow";
const ATTR_CONTENT = "content";
const ATTR_HREF = "href";
const CANONICAL_SELECTOR = 'link[rel="canonical"]';

const TITLE_META: readonly string[] = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[property="og:image:alt"]',
    'meta[name="twitter:image:alt"]',
];

const DESCRIPTION_META: readonly string[] = [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
];

const IMAGE_META: readonly string[] = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
];

const URL_META: readonly string[] = ['meta[property="og:url"]'];
const ROBOTS_META: readonly string[] = ['meta[name="robots"]'];

function setIfPresent(selector: string, attr: string, value: string): void {
    const el = document.head.querySelector(selector);
    if (el !== null) el.setAttribute(attr, value);
}

function setAllContent(selectors: readonly string[], value: string | null): void {
    if (value === null) return;
    for (const selector of selectors) setIfPresent(selector, ATTR_CONTENT, value);
}

function computeTitle(path: string, title: string): string {
    return path === HOME_PATH ? title : BRAND_PREFIX + title;
}

function computeRobots(hidden: boolean | undefined): string {
    return hidden === true ? ROBOTS_NOINDEX : ROBOTS_INDEX;
}

async function resolveSeo(path: string, seo: RouteSeoData | RouteSeoResolver): Promise<RouteSeoData | null> {
    if (typeof seo === "function") return seo(path);
    return seo;
}

export async function applyRouteSeo(path: string, seo: RouteSeoData | RouteSeoResolver): Promise<void> {
    const data = await resolveSeo(path, seo);
    if (!data) return;
    const title = computeTitle(path, data.title);
    const url = SITE_ORIGIN + path;
    document.title = title;
    setAllContent(TITLE_META, title);
    setAllContent(DESCRIPTION_META, data.description);
    setAllContent(IMAGE_META, data.image ?? null);
    setAllContent(URL_META, url);
    setAllContent(ROBOTS_META, computeRobots(data.hidden));
    setIfPresent(CANONICAL_SELECTOR, ATTR_HREF, url);
}
