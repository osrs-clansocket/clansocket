import { AppRoutes } from "../../../managers/router/types.js";
import { matchClanPath } from "../../../managers/router/slug-paths.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.CLAN,
    match: matchClanPath,
    description: "A clan's dashboard. :slug is the clan's lowercase slug.",
    example: "/clans/varietyz",
    render: async (path) => (await import("../../pages/clans/index.js")).renderClan(path),
});
