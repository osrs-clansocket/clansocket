import { HTTP_BAD_REQUEST } from "../../../shared/http/http-status.js";
import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { formatStateFull } from "../../persona/prompt/index.js";
import { promptLoader } from "../../persona/prompt-loader/index.js";
import { pinnedContext } from "../../memory/pinned-context.js";
import { getSchema } from "../../queries/db-query/index.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { formatClientHistory } from "./normalize.js";
import sendRouter from "./send.js";

promptLoader.registerDynamic(
    {
        id: "page-state",
        type: "schema",
        priority: 18,
        always_load: false,
        triggers: [],
        depends_on: [],
        placeholders: [],
    },
    (ctx) => (ctx.pageState ? formatStateFull(ctx.pageState) : "No page state available."),
    false,
);

promptLoader.registerDynamic(
    {
        id: "db-schema",
        type: "schema",
        priority: 18,
        always_load: false,
        triggers: [],
        depends_on: [],
        placeholders: [],
    },
    (ctx) => getSchema(ctx.siteAccountId),
);

promptLoader.registerDynamic(
    {
        id: "chat-history",
        type: "context",
        priority: 19,
        always_load: true,
        triggers: [],
        depends_on: [],
        placeholders: [],
    },
    (ctx) => (ctx.history !== undefined ? formatClientHistory(ctx.history, ctx.historyWindow) : ""),
);

promptLoader.registerDynamic(
    {
        id: "prompt-index",
        type: "schema",
        priority: 17,
        always_load: false,
        triggers: [],
        depends_on: [],
        placeholders: [],
    },
    (ctx) => {
        const index = promptLoader.readableIndex(ctx);
        const pinned = pinnedContext.list(ctx.siteAccountId);
        const lines = [
            "# Prompt Index",
            "",
            'Every readable id + preview. Use `read: ["<id>"]` to load once, `pin: ["<id>"]` to keep across turns.',
            "📌 = currently pinned.",
            "",
        ];
        for (const e of index) {
            const mark = pinned.includes(e.id) ? "📌" : "  ";
            lines.push(`${mark} [${e.type}] ${e.id} — ${e.preview}`);
        }
        return lines.join("\n");
    },
);

const webRoutingPath = join(dirname(fileURLToPath(import.meta.url)), "../../prompts/auto-gen/web-routing.json");

function formatWebRouting(): string {
    let routes: { pattern: string; description: string }[];
    try {
        routes = (
            JSON.parse(readFileSync(webRoutingPath, "utf-8")) as { routes: { pattern: string; description: string }[] }
        ).routes;
    } catch {
        return "No route table available.";
    }
    const lines = [
        "# app routes",
        "",
        "set `actions.route` to a path; the executor calls `router.navigate(path)`. substitute :params with real values and url-encode them.",
        "",
    ];
    for (const r of routes) lines.push(`- ${r.pattern} — ${r.description}`);
    return lines.join("\n");
}

const WEB_ROUTING = formatWebRouting();

promptLoader.registerDynamic(
    {
        id: "dashboard-web-routing",
        type: "context",
        priority: 15,
        always_load: false,
        triggers: ["route", "navigate", "url", "clan page", "go to", "open", "share link", "bookmark", "deep link"],
        depends_on: [],
        placeholders: [],
    },
    () => WEB_ROUTING,
);

const router = express.Router();
router.use(sendRouter);

router.get("/context", requireSiteAccount, (req, res) => {
    res.json({ pinned: pinnedContext.list(req.siteAccountId!) });
});

router.post("/context/unpin", requireSiteAccount, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(HTTP_BAD_REQUEST).json({ error: "ids array required" });
    const remaining = pinnedContext.unpin(req.siteAccountId!, ids);
    res.json({ pinned: remaining });
});

router.post("/context/clear", requireSiteAccount, (req, res) => {
    pinnedContext.clear(req.siteAccountId!);
    res.json({ pinned: [] });
});

export default router;
