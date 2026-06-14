import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.HOME,
    description: "Home — the landing page and clan directory.",
    render: async () => (await import("../../pages/routes/render-home.js")).renderHome(),
});
