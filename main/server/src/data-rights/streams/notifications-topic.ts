import { listNotificationViews } from "../../notifications/helpers.js";
import { SCOPE_APP } from "../scopes/user-scope/index.js";
import type { ProjectionTopic } from "./projection.js";

// per-user undismissed notifications as a projection topic: recomputed whenever the
// notifications table is written, keyed by notification id.
export function notificationsTopic(siteAccountId: string): ProjectionTopic {
    return {
        triggers: [{ scopeKey: SCOPE_APP, table: "clansocket_notifications" }],
        query: () => listNotificationViews(siteAccountId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.id),
    };
}
