import { getClanPluginDb } from "../../core/database.js";
import { lookupRsnForHash } from "../plugin-rsn-lookup.js";
import { buildEventEnvelope, type EnvelopeContext } from "./envelope.js";
import { BUCKET_MS, type Payload } from "./helpers.js";
import { BUCKET_ROUTES } from "./route-buckets.js";
import { CURRENT_STATE_ROUTES } from "./route-current-state.js";
import { EVENT_ROUTES } from "./route-events.js";

export interface BatchEnvelopeCtx {
    batchSeq: number;
    batchTick: number | null;
}

export function routePluginEvent(
    clanId: string,
    mode: string,
    sessionId: string,
    accountHash: string,
    eventType: string,
    payload: Payload,
    batchCtx: BatchEnvelopeCtx,
): void {
    const conn = getClanPluginDb(clanId, mode);
    const rsn = lookupRsnForHash(conn, accountHash);
    const now = Date.now();

    const csHandler = CURRENT_STATE_ROUTES[eventType];
    if (csHandler) {
        const envelopeCtx: EnvelopeContext = {
            sessionId,
            accountHash,
            batchSeq: batchCtx.batchSeq,
            batchTick: batchCtx.batchTick,
            eventType,
        };
        const envelope = buildEventEnvelope(conn, envelopeCtx, payload);
        csHandler(conn, accountHash, rsn, payload, now, envelope);
        return;
    }
    const evHandler = EVENT_ROUTES[eventType];
    if (evHandler) {
        evHandler(conn, accountHash, rsn, payload, now);
        return;
    }
    const buHandler = BUCKET_ROUTES[eventType];
    if (buHandler) {
        buHandler(conn, accountHash, rsn, payload, Math.floor(now / BUCKET_MS));
    }
}
