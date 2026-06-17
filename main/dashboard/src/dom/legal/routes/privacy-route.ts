import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.PRIVACY,
    description: "Privacy Policy — placeholder shell pending legal text.",
    seo: {
        title: "Privacy Policy",
        description: "How ClanSocket handles your account data and clan telemetry.",
    },
    render: async () => (await import("../../pages/routes/render-privacy.js")).renderPrivacy(),
});
