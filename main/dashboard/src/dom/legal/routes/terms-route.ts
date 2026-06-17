import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.TERMS,
    description: "Terms of Service — placeholder shell pending legal text.",
    seo: {
        title: "Terms of Service",
        description: "Terms of service for the ClanSocket platform.",
    },
    render: async () => (await import("../../pages/routes/render-terms.js")).renderTerms(),
});
