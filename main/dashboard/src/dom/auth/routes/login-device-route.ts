import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.LOGIN_DEVICE,
    description: "Device login — sign in by linking this device.",
    seo: {
        title: "Sign In With Device",
        description: "Sign in by linking this device to your ClanSocket account.",
        hidden: true,
    },
    render: async () => (await import("../render-login-device/index.js")).renderLoginDevice(),
});
