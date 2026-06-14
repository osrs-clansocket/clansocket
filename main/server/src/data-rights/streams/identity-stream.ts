import { EventEmitter } from "node:events";

const emitters = new Map<string, EventEmitter>();

function emitterFor(siteAccountId: string): EventEmitter {
    let e = emitters.get(siteAccountId);
    if (!e) {
        e = new EventEmitter();
        e.setMaxListeners(0);
        emitters.set(siteAccountId, e);
    }
    return e;
}

export type IdentityStreamEventKind =
    | "created"
    | "cancelled"
    | "confirmed"
    | "rejected"
    | "displaced"
    | "removed"
    | "claim_consent_created"
    | "claim_consent_resolved";

export type IdentityStreamEvent = { kind: IdentityStreamEventKind };
export type IdentityStreamHandler = (event: IdentityStreamEvent) => void;

export function broadcastIdentityUpdate(siteAccountId: string, kind: IdentityStreamEventKind): void {
    const e = emitters.get(siteAccountId);
    if (!e) return;
    e.emit("identity", { kind });
}

export function subscribeIdentityStream(siteAccountId: string, handler: IdentityStreamHandler): () => void {
    const e = emitterFor(siteAccountId);
    e.on("identity", handler);
    return () => {
        e.off("identity", handler);
        if (e.listenerCount("identity") === 0) emitters.delete(siteAccountId);
    };
}
