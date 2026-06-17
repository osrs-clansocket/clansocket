import { createHash, randomInt } from "node:crypto";
import logger from "@clansocket/logger";
import { WOMClient, type Metric, type Period } from "@wise-old-man/utils";
import { readVaultEntry } from "../../clan-vault/index.js";
import { ClanAuditActions } from "../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../database/clans/audit/clan-audit-helpers/record.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNAUTHORIZED,
} from "../../shared/http/http-status.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { markBackfillCompleted } from "../../database/wom/identity/mark-backfill-completed.js";
import {
    getNextDueAtForClan,
    listPendingWomForClan,
    type PendingWomRow,
} from "../../database/wom/outbound/list-pending.js";
import { recordWomOutboundFailure } from "../../database/wom/outbound/record-failure.js";
import {
    markWomApplied,
    markWomDeadLetter,
    markWomFailed,
    markWomInFlight,
} from "../../database/wom/outbound/transition.js";
import { getWomRateWindow } from "../../database/wom/rate-window/get.js";
import {
    recordWom429,
    recordWomRequestSent,
    recordWomSuccess,
    rollWomWindowIfElapsed,
} from "../../database/wom/rate-window/update.js";
import type { WomPayload } from "../types/wom-types.js";
import { validateWomPayload } from "../validators/wom-payload-validator.js";
import { routeWomResponse } from "../handlers/wom-response-router.js";
import { scheduleWomWakeForClan } from "./wom-dispatcher.js";

function detectAndRecordBackfillCompletion(clanId: string): void {
    const identity = getClanWomIdentity(clanId);
    if (!identity || identity.last_backfill_status !== "in_progress") return;
    const result = markBackfillCompleted(clanId);
    if (!result.changed) return;
    const msElapsed = result.startedAtMs !== null ? Date.now() - result.startedAtMs : 0;
    recordClanAudit(clanId, {
        actor: null,
        actorKind: "system",
        action: ClanAuditActions.WomBackfillCompleted,
        targetId: null,
        payload: { rowsInserted: 0, rowsUpdated: 0, rowsSkipped: 0, msElapsed },
    });
}

const ANON_RATE_LIMIT = 20;
const KEYED_RATE_LIMIT = 100;
const WINDOW_MS = 60000;
const SDK_CALL_TIMEOUT_MS = 30000;
const BACKOFF_429_MIN_MS = 30000;
const BACKOFF_429_MAX_MS = 90001;
const NETWORK_ERROR_BACKOFF_MS = 60000;
const FAILED_REQUEST_ERROR_CODE = 0;
const GROUPS_PATH_PREFIX = "/groups/";

const REQUEST_KIND_GROUP_DETAILS = "group-details";
const REQUEST_KIND_GROUP_HISCORES = "group-hiscores";
const REQUEST_KIND_GROUP_NAME_CHANGES = "group-name-changes";
const REQUEST_KIND_GROUP_GAINED = "group-gained";
const REQUEST_KIND_PLAYER_SNAPSHOT = "player-snapshot";
const REQUEST_KIND_VERIFY = "verify-credentials";
const PLAYERS_PATH_PREFIX = "/players/";

const CALLER_ERROR_STATUSES = new Set<number>([HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, HTTP_NOT_FOUND]);

interface SdkError {
    statusCode?: number;
    message?: string;
}

function parseGroupIdFromPath(path: string): number | null {
    if (!path.startsWith(GROUPS_PATH_PREFIX)) return null;
    const rest = path.substring(GROUPS_PATH_PREFIX.length);
    const slashIdx = rest.indexOf("/");
    const idStr = slashIdx === -1 ? rest : rest.substring(0, slashIdx);
    const n = Number(idStr);
    if (Number.isNaN(n) || n <= 0) return null;
    return n;
}

function parseUsernameFromPath(path: string): string | null {
    if (!path.startsWith(PLAYERS_PATH_PREFIX)) return null;
    const rest = path.substring(PLAYERS_PATH_PREFIX.length);
    const slashIdx = rest.indexOf("/");
    const encoded = slashIdx === -1 ? rest : rest.substring(0, slashIdx);
    if (encoded.length === 0) return null;
    try {
        return decodeURIComponent(encoded);
    } catch {
        return null;
    }
}

function readBody(row: PendingWomRow): Record<string, unknown> {
    if (!row.body_json) return {};
    return JSON.parse(row.body_json) as Record<string, unknown>;
}

function requireGroupId(path: string): number {
    const groupId = parseGroupIdFromPath(path);
    if (groupId === null) throw new Error(`unknown group request_path for SDK dispatch: ${path}`);
    return groupId;
}

async function dispatchSdkCall(client: WOMClient, head: PendingWomRow): Promise<unknown> {
    const body = readBody(head);
    switch (head.request_kind) {
        case REQUEST_KIND_GROUP_DETAILS:
            return client.groups.getGroupDetails(requireGroupId(head.request_path));
        case REQUEST_KIND_GROUP_HISCORES: {
            const metric = (body.metric as Metric | undefined) ?? ("overall" as Metric);
            return client.groups.getGroupHiscores(requireGroupId(head.request_path), metric);
        }
        case REQUEST_KIND_GROUP_NAME_CHANGES:
            return client.groups.getGroupNameChanges(requireGroupId(head.request_path));
        case REQUEST_KIND_GROUP_GAINED: {
            const metric = (body.metric as Metric | undefined) ?? ("overall" as Metric);
            const period = (body.period as Period | undefined) ?? ("week" as Period);
            return client.groups.getGroupGains(requireGroupId(head.request_path), { metric, period });
        }
        case REQUEST_KIND_PLAYER_SNAPSHOT: {
            const username = parseUsernameFromPath(head.request_path);
            if (username === null)
                throw new Error(`unknown player request_path for SDK dispatch: ${head.request_path}`);
            return client.players.getPlayerDetails(username);
        }
        case REQUEST_KIND_VERIFY: {
            const code = body.verificationCode as string | undefined;
            if (typeof code !== "string" || code.length === 0) {
                throw new Error("verify-credentials request missing verificationCode in body");
            }
            return client.groups.updateAll(requireGroupId(head.request_path), code);
        }
        default:
            throw new Error(`unknown request_kind: ${head.request_kind}`);
    }
}

async function dispatchWithTimeout(client: WOMClient, head: PendingWomRow): Promise<unknown> {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SDK request timeout exceeded")), SDK_CALL_TIMEOUT_MS);
    });
    try {
        return await Promise.race([dispatchSdkCall(client, head), timeoutPromise]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

function backoff429Ms(): number {
    return randomInt(BACKOFF_429_MIN_MS, BACKOFF_429_MAX_MS);
}

function safeRouteResponse(clanId: string, head: PendingWomRow, result: unknown): void {
    try {
        routeWomResponse(clanId, head.request_kind, head.body_json, result);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[wom-dispatcher] response routing failed clan=${clanId} kind=${head.request_kind}: ${message}`);
    }
}

async function fireRequest(
    clanId: string,
    head: PendingWomRow,
    creds: WomPayload,
    windowCountBefore: number,
    consecutive429Before: number,
    rateLimit: number,
): Promise<void> {
    recordWomRequestSent(clanId, windowCountBefore, rateLimit);
    const client = new WOMClient({ apiKey: creds.api_key, userAgent: creds.user_agent });
    const attemptNo = head.attempts + 1;
    try {
        const result = await dispatchWithTimeout(client, head);
        if (result === undefined) {
            throw new Error(
                "SDK returned undefined - upstream status outside the SDK handled set (400/403/404/429/500)",
            );
        }
        const bodyHash = createHash("sha256").update(JSON.stringify(result)).digest("hex");
        markWomApplied(clanId, head.queue_id, bodyHash);
        recordWomSuccess(clanId);
        safeRouteResponse(clanId, head, result);
        scheduleWomWakeForClan(clanId, Date.now());
    } catch (err) {
        const sdkErr = err as SdkError;
        const statusCode = sdkErr.statusCode ?? FAILED_REQUEST_ERROR_CODE;
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
            `[wom-dispatcher] sdk call failed for clan ${clanId} queue ${head.queue_id} (status=${statusCode}): ${message}`,
        );
        recordWomOutboundFailure({ clanId, queueId: head.queue_id, attemptNo, errorCode: statusCode });
        if (CALLER_ERROR_STATUSES.has(statusCode)) {
            markWomDeadLetter(clanId, head.queue_id, statusCode);
            scheduleWomWakeForClan(clanId, Date.now());
            return;
        }
        if (statusCode === HTTP_TOO_MANY_REQUESTS) {
            recordWom429(clanId, consecutive429Before);
            markWomFailed(clanId, head.queue_id, statusCode, attemptNo);
            scheduleWomWakeForClan(clanId, Date.now() + backoff429Ms());
            return;
        }
        markWomFailed(clanId, head.queue_id, statusCode, attemptNo);
        const nextWake = statusCode === FAILED_REQUEST_ERROR_CODE ? Date.now() + NETWORK_ERROR_BACKOFF_MS : Date.now();
        scheduleWomWakeForClan(clanId, nextWake);
    }
}

function failAllPendingAsUnauthorized(clanId: string): void {
    for (const item of listPendingWomForClan(clanId)) {
        markWomFailed(clanId, item.queue_id, HTTP_UNAUTHORIZED, item.attempts + 1);
    }
}

export async function processClanWomQueueOnce(clanId: string): Promise<void> {
    const creds = await readVaultEntry<WomPayload>(
        clanId,
        "wom",
        { kind: "system", component: "wom-dispatcher" },
        validateWomPayload,
    );
    if (!creds) {
        failAllPendingAsUnauthorized(clanId);
        return;
    }
    const pending = listPendingWomForClan(clanId);
    if (pending.length === 0) {
        detectAndRecordBackfillCompletion(clanId);
        const nextDue = getNextDueAtForClan(clanId);
        if (nextDue !== null && nextDue > Date.now()) scheduleWomWakeForClan(clanId, nextDue);
        return;
    }
    const rateLimit = creds.api_key ? KEYED_RATE_LIMIT : ANON_RATE_LIMIT;
    const initial = getWomRateWindow(clanId, rateLimit);
    rollWomWindowIfElapsed(clanId, initial.window_start);
    const win = getWomRateWindow(clanId, rateLimit);
    if (win.state_name === "banned") {
        logger.warn(`[wom-dispatcher] clan ${clanId} in banned state; deferring`);
        scheduleWomWakeForClan(clanId, Date.now() + WINDOW_MS);
        return;
    }
    const spacingMs = WINDOW_MS / rateLimit;
    const now = Date.now();
    if (now - win.last_request_at < spacingMs) {
        scheduleWomWakeForClan(clanId, win.last_request_at + spacingMs);
        return;
    }
    if (win.window_count >= rateLimit) {
        scheduleWomWakeForClan(clanId, win.window_start + WINDOW_MS);
        return;
    }
    const head = pending[0];
    if (!markWomInFlight(clanId, head.queue_id)) return;
    await fireRequest(clanId, head, creds, win.window_count, win.consecutive_429, rateLimit);
}
