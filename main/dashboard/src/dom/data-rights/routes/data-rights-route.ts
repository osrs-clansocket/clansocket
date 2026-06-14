import { AppRoutes } from "../../../managers/router/types.js";
import { defineRoute } from "../../../managers/router/registry.js";
import { authState } from "../../../managers/auth-state.js";

const DATA_RIGHTS_QUERY_PREFIX = `${AppRoutes.DATA_RIGHTS}?`;

defineRoute({
    path: AppRoutes.DATA_RIGHTS,
    match: (p) => p === AppRoutes.DATA_RIGHTS || p.startsWith(DATA_RIGHTS_QUERY_PREFIX),
    description: "Your data-rights browser — export or delete your stored data.",
    guard: () => authState.isAuthed(),
    onReject: AppRoutes.HOME,
    render: async () => (await import("../../pages/routes/data-rights/index.js")).renderDataRights(),
});
