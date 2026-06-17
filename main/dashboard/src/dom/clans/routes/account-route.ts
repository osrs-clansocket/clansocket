import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";
import { authState } from "../../../managers/auth-state.js";

defineRoute({
    path: AppRoutes.ACCOUNT,
    description: "Your account — clans, RSNs, linked accounts, sign-in devices, vault.",
    seo: {
        title: "Your Account",
        description: "Your ClanSocket account, clans, RSNs, linked accounts, and devices.",
        hidden: true,
    },
    guard: () => authState.isAuthed(),
    onReject: AppRoutes.HOME,
    render: async () => (await import("../account/index.js")).renderAccount(),
});
