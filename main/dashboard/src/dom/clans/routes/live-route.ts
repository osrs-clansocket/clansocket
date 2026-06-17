import { AppRoutes } from "../../../managers/router/types.js";
import { matchClanLivePath } from "../../../managers/router/slug-paths.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.CLAN_LIVE,
    match: matchClanLivePath,
    description: "Live clan-positions map. Shows current location of every clan member running the plugin.",
    example: "/clans/varietyz/live",
    seo: {
        title: "Live Clan Map",
        description: "Real-time clan position map driven by the plugin stream.",
        hidden: true,
    },
    render: async (path) => (await import("../../pages/clans/render-clan-map.js")).renderClanMap(path),
});
