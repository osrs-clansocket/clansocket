import { AppRoutes } from "../../../managers/router/types.js";
import type { RouteSeoData } from "../../../managers/router/types.js";
import { matchClanPath, clanSlugFromPath } from "../../../managers/router/slug-paths.js";
import { defineRoute } from "../../../managers/router/registry.js";

const seoCache = new Map<string, Promise<RouteSeoData | null>>();

function lookupOrFetchClanSeo(slug: string): Promise<RouteSeoData | null> {
    const cached = seoCache.get(slug);
    if (cached !== undefined) return cached;
    const fresh = (async (): Promise<RouteSeoData | null> => {
        const { clansClient } = await import("../../../state/clans/clans-client/index.js");
        return clansClient.fetchClanSeo(slug);
    })();
    seoCache.set(slug, fresh);
    return fresh;
}

defineRoute({
    path: AppRoutes.CLAN,
    match: matchClanPath,
    description: "A clan's dashboard. :slug is the clan's lowercase slug.",
    example: "/clans/varietyz",
    seo: async (path) => {
        const slug = clanSlugFromPath(path);
        if (slug.length === 0) return null;
        return lookupOrFetchClanSeo(slug);
    },
    render: async (path) => (await import("../../pages/clans/index.js")).renderClan(path),
});
