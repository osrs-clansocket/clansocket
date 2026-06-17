import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.RECOVER,
    description: "Account recovery — regain access to an account.",
    seo: {
        title: "Account Recovery",
        description: "Recover access to your ClanSocket account.",
        hidden: true,
    },
    render: async () => (await import("../render-recover.js")).renderRecover(),
});
