import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.HOME,
    description: "Home — the landing page and clan directory.",
    seo: {
        title: "ClanSocket - Live, Open-Source platform for Old School RuneScape clans",
        description:
            "Verified clan identity, live RuneLite telemetry, discord-server management, Wise Old Man backfill, and an AI operator for clan leaders.",
    },
    render: async () => (await import("../../pages/routes/render-home.js")).renderHome(),
});
