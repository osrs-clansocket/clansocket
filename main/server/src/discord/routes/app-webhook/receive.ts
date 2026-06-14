import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { verifyEd25519 } from "../../../crypto/ed25519-verifier.js";
import { HTTP_NO_CONTENT, HTTP_UNAUTHORIZED } from "../../../shared/http/http-status.js";

const WEBHOOK_TYPE_EVENT = 1;
const INTEGRATION_GUILD = 0;
const INTEGRATION_USER = 1;

interface WebhookEnvelope {
    version: number;
    application_id: string;
    type: number;
    event?: { type: string; timestamp: string; data: unknown };
}

interface AuthorizedData {
    integration_type: number;
    user?: { id: string };
    scopes?: string[];
    guild?: { id: string; name?: string };
}

interface DeauthorizedData {
    user?: { id: string };
}

function logAuthorized(data: unknown): void {
    const d = data as AuthorizedData;
    if (d.integration_type === INTEGRATION_GUILD && d.guild) {
        const scopes = (d.scopes ?? []).join(",");
        logger.info(
            `[discord-webhook] AUTHORIZED guild_id=${d.guild.id} guild_name=${d.guild.name ?? ""} installer_user_id=${d.user?.id ?? ""} scopes=${scopes}`,
        );
        return;
    }
    if (d.integration_type === INTEGRATION_USER) {
        const scopes = (d.scopes ?? []).join(",");
        logger.info(`[discord-webhook] AUTHORIZED user_install user_id=${d.user?.id ?? ""} scopes=${scopes}`);
        return;
    }
    logger.info(`[discord-webhook] AUTHORIZED integration_type=${d.integration_type} (unrecognized)`);
}

function logDeauthorized(data: unknown): void {
    const d = data as DeauthorizedData;
    logger.info(`[discord-webhook] DEAUTHORIZED user_id=${d.user?.id ?? ""}`);
}

const EVENT_HANDLERS: Record<string, (data: unknown) => void> = {
    APPLICATION_AUTHORIZED: logAuthorized,
    APPLICATION_DEAUTHORIZED: logDeauthorized,
};

function dispatchEvent(event: { type: string; data: unknown }): void {
    const handler = EVENT_HANDLERS[event.type];
    if (handler) {
        handler(event.data);
        return;
    }
    logger.info(`[discord-webhook] event=${event.type} (unhandled)`);
}

function rejectUnauthorized(res: Response): void {
    res.status(HTTP_UNAUTHORIZED).end();
}

function validateAndExtractBody(req: Request): Buffer | null {
    const signature = req.header("x-signature-ed25519");
    const timestamp = req.header("x-signature-timestamp");
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!signature || !timestamp || !publicKey || !rawBody) return null;
    return verifyEd25519(signature, timestamp, rawBody, publicKey) ? rawBody : null;
}

function processEnvelope(envelope: WebhookEnvelope, res: Response): void {
    if (envelope.type === WEBHOOK_TYPE_EVENT && envelope.event) {
        try {
            dispatchEvent(envelope.event);
        } catch (err) {
            logger.error(`[discord-webhook] dispatch failed: ${(err as Error).message}`);
        }
    }
    res.status(HTTP_NO_CONTENT).end();
}

const router: Router = Router();

router.post("/", (req: Request, res: Response) => {
    if (!validateAndExtractBody(req)) {
        rejectUnauthorized(res);
        return;
    }
    processEnvelope(req.body as WebhookEnvelope, res);
});

export default router;
