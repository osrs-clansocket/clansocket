import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnProp, AsnPropTypes, AsnIntegerArrayBufferConverter } from "@peculiar/asn1-schema";
AsnProp({ type: AsnPropTypes.Integer, converter: AsnIntegerArrayBufferConverter })(
    ECDSASigValue.prototype as object,
    "r",
);
AsnProp({ type: AsnPropTypes.Integer, converter: AsnIntegerArrayBufferConverter })(
    ECDSASigValue.prototype as object,
    "s",
);
import { HEADER_CONTENT_TYPE, MIME_JSON } from "./shared/http/http-mime.js";
import { HTTP_NOT_FOUND } from "./shared/http/http-status.js";
import logger from "@clansocket/logger";
import express from "express";
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ensureCerts } from "./certs.js";
import { loadClanVaultMasterKey } from "./crypto/clan-vault-master-key-loader.js";
import { initializeDatabase, closeDatabase } from "./database/index.js";
import { seedDefaultBotIdentity } from "./database/discord/seed-default.js";
import { registerByoBotVaultEntry } from "./discord/byo-bot/registrars/byo-bot-vault-registrar.js";
import { runAiBootCleanup } from "./ai/lifecycle/boot-cleanup.js";
import aiChatRouter from "./ai/routes/chat/index.js";
import aiMemoryRouter from "./ai/routes/memory-routes.js";
import aiPersonaRouter from "./ai/routes/persona-routes.js";
import siteAuthRouter from "./auth/site-routes/index.js";
import clansRouter from "./clans/routes/index.js";
import clansManageRouter from "./clans/manage-routes/index.js";
import dataRightsRouter from "./data-rights/routes/index.js";
import discordRouter from "./discord/routes/index.js";
import { mapApiRouter } from "./map-assets/index.js";
import notificationsRouter from "./notifications/routes.js";
import legacyRsnRouter from "./legacy-rsn/routes.js";
import passkeyRouter from "./auth/passkey/handlers/index.js";
import { auditContext, readCausedByHeader } from "./shared/audit-context.js";
import { randomUUID } from "node:crypto";
import { attachPluginApi, detachPluginApi, runPluginBootCleanup, pluginMetricsRouter } from "./plugin-api/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(SERVER_ROOT, "..", "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env") });
const dataDir = path.join(SERVER_ROOT, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();
app.disable("x-powered-by");
if (!process.env.SERVER_PORT) throw new Error("SERVER_PORT env var required");
if (!process.env.DASHBOARD_PORT) throw new Error("DASHBOARD_PORT env var required");
const PORT = parseInt(process.env.SERVER_PORT, 10);
const DASHBOARD_URL = "https://localhost:" + process.env.DASHBOARD_PORT;
const DIST = path.join(REPO_ROOT, "dist");

if (process.env.BEHIND_PROXY === "1") {
    app.set("trust proxy", 1);
}

app.use(
    express.json({
        limit: "4mb",
        verify: (req: any, _res, buf: Buffer) => {
            req.rawBody = buf;
        },
    }),
);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const e = err as { type?: string; statusCode?: number; status?: number; message?: string } | null;
    if (!e) {
        next(err);
        return;
    }
    const code = e.statusCode ?? e.status ?? 0;
    if (code >= 400 && code < 500) {
        res.status(code).json({ error: "bad_request" });
        return;
    }
    if (e.type === "entity.parse.failed" || e.type === "entity.too.large" || e.type === "encoding.unsupported") {
        res.status(400).json({ error: "bad_request" });
        return;
    }
    next(err);
});

app.use((req, _res, next) => {
    const causedBy = readCausedByHeader(req.headers["x-caused-by"]);
    auditContext.run({ causedBy, requestId: randomUUID(), startMs: Date.now() }, () => next());
});

app.use("/api/ai/chat", aiChatRouter);
app.use("/api/ai/memory", aiMemoryRouter);
app.use("/api/ai/persona", aiPersonaRouter);
app.use("/api/auth/site", siteAuthRouter);
app.use("/api/auth/site/passkey", passkeyRouter);
app.use("/api/clans", clansManageRouter);
app.use("/api/clans", clansRouter);
app.use("/api/data-rights", dataRightsRouter);
app.use("/api/discord", discordRouter);
app.use("/api/me/notifications", notificationsRouter);
app.use("/api/me/legacy-rsns", legacyRsnRouter);
app.use("/api/clansocket", pluginMetricsRouter);
app.use("/api/map", mapApiRouter);

const MIME_BY_EXT: Record<string, string> = {
    ".js": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": MIME_JSON,
    ".svg": "image/svg+xml",
};

const IS_DEV = process.env.NODE_ENV !== "production";

if (!IS_DEV) {
    app.use((req, res, next) => {
        const accept = req.headers["accept-encoding"] ?? "";
        if (!accept.includes("br")) return next();

        const filePath = path.join(DIST, req.path);
        if (!fs.existsSync(filePath + ".br")) return next();

        req.url += ".br";
        res.setHeader("Content-Encoding", "br");
        const mime = MIME_BY_EXT[path.extname(filePath)];
        if (mime) res.setHeader(HEADER_CONTENT_TYPE, mime);
        next();
    });

    app.use(express.static(DIST, { maxAge: "1y", immutable: true, index: false }));
    app.get("/{*splat}", (_req, res) => res.sendFile(path.join(DIST, "index.html")));
} else {
    app.use((_req, res) => {
        res.status(HTTP_NOT_FOUND).json({
            error: "frontend_not_served_in_dev",
            message: `This port serves /api/* and /ws/* only. Open ${DASHBOARD_URL} for the SPA with HMR.`,
        });
    });
}

async function start(): Promise<void> {
    initializeDatabase();
    runAiBootCleanup();
    runPluginBootCleanup();
    try {
        loadClanVaultMasterKey();
        logger.info("clan vault master key loaded");
    } catch (e) {
        logger.warn(
            `[clan-vault] master key not loaded: ${(e as Error).message}. vault ops will fail until CLANSOCKET_CLAN_VAULT_MASTER_KEY is set.`,
        );
    }
    registerByoBotVaultEntry();
    const seeded = seedDefaultBotIdentity();
    if (seeded) logger.info("seeded clansocket-default discord bot identity from env");
    const behindProxy = process.env.BEHIND_PROXY === "1";
    const server = behindProxy ? http.createServer(app) : https.createServer(await ensureCerts(), app);
    const scheme = behindProxy ? "http" : "https";
    server.listen(PORT, () => {
        logger.info(`Server running on ${scheme}://localhost:${PORT}`);
        attachPluginApi(server);
    });
    const shutdown = () => {
        detachPluginApi();
        closeDatabase();
        server.close();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

start();
