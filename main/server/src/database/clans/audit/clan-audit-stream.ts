import { EventEmitter } from "node:events";
import type { ClanAuditEntry } from "./clan-audit-helpers/list/index.js";

const emitters = new Map<string, EventEmitter>();

function emitterFor(clanId: string): EventEmitter {
    let e = emitters.get(clanId);
    if (!e) {
        e = new EventEmitter();
        e.setMaxListeners(64);
        emitters.set(clanId, e);
    }
    return e;
}

export type AuditStreamHandler = (entry: ClanAuditEntry) => void;

export function broadcastClanAuditEntry(clanId: string, entry: ClanAuditEntry): void {
    const e = emitters.get(clanId);
    if (!e) return;
    e.emit("audit", entry);
}

export function subscribeClanAuditStream(clanId: string, handler: AuditStreamHandler): () => void {
    const e = emitterFor(clanId);
    e.on("audit", handler);
    return () => {
        e.off("audit", handler);
        if (e.listenerCount("audit") === 0) emitters.delete(clanId);
    };
}
