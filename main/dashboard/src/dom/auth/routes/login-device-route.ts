import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";

defineRoute({
    path: AppRoutes.LOGIN_DEVICE,
    description: "Device login — sign in by linking this device.",
    render: async () => (await import("../render-login-device/index.js")).renderLoginDevice(),
});
