import { asFiniteNumber } from "../../shared/coerce.js";
import { parseScope } from "../scopes/user-scope/index.js";
import { browseTopic } from "./browse-topic.js";
import { clansTopic } from "./clans-topic.js";
import { memberClansTopic } from "./member-clans-topic.js";
import { notificationsTopic } from "./notifications-topic.js";
import { registerTopic } from "./projection-registry.js";

// data-rights table browser: scope + table + window come from the query string.
registerTopic("browse", (siteAccountId, q) => {
    const scope = parseScope({ kind: q.kind, clanId: q.clanId, mode: q.mode });
    const table = typeof q.table === "string" ? q.table : "";
    if (!scope || table.length === 0) return null;
    return browseTopic(siteAccountId, {
        scope,
        table,
        from: asFiniteNumber(q.from) ?? undefined,
        to: asFiniteNumber(q.to) ?? undefined,
        rsn: typeof q.rsn === "string" ? q.rsn : undefined,
        limit: asFiniteNumber(q.limit) ?? undefined,
        offset: asFiniteNumber(q.offset) ?? undefined,
        managerView: q.managerView === "true" || q.managerView === "1",
    });
});

// per-user undismissed notifications, keyed by id; recomputed on writes to the table.
registerTopic("notifications", (siteAccountId) => notificationsTopic(siteAccountId));

// the user's managed clans, keyed by clan id; recomputed on clan or manager writes.
registerTopic("clans", (siteAccountId) => clansTopic(siteAccountId));

// the user's member-of clans (excluding managed clans, which the "clans" topic covers).
// recomputed on clan, binding, or per-member-clan roster writes.
registerTopic("member_clans", (siteAccountId) => memberClansTopic(siteAccountId));
