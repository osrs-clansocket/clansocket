import { Router, type Request, type Response } from "express";
import { listPublicClanSlugs } from "../../database/index.js";

const router: Router = Router();

const SITE_ORIGIN = "https://clansocket.com";
const HOME_PATH = "/";
const HOME_PRIORITY = "1.0";
const DEFAULT_PRIORITY = "0.5";
const DEFAULT_CHANGEFREQ = "weekly";
const CLAN_PATH_PREFIX = "/clans/";
const ISO_DATE_LEN = 10;
const STATIC_PATHS: readonly string[] = [HOME_PATH, "/privacy", "/terms"];

function todayIso(): string {
    return new Date().toISOString().slice(0, ISO_DATE_LEN);
}

function priorityFor(path: string): string {
    return path === HOME_PATH ? HOME_PRIORITY : DEFAULT_PRIORITY;
}

function urlEntry(path: string, lastmod: string, priority: string): string {
    return [
        "  <url>",
        `    <loc>${SITE_ORIGIN}${path}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${DEFAULT_CHANGEFREQ}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
    ].join("\n");
}

router.get("/sitemap.xml", (_req: Request, res: Response) => {
    const lastmod = todayIso();
    const pairs: Array<[string, string]> = [];
    for (const p of STATIC_PATHS) pairs.push([p, priorityFor(p)]);
    for (const slug of listPublicClanSlugs()) pairs.push([`${CLAN_PATH_PREFIX}${slug}`, DEFAULT_PRIORITY]);
    const body = pairs.map(([p, prio]) => urlEntry(p, lastmod, prio)).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
    res.type("application/xml").send(xml);
});

export default router;
