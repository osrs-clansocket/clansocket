import { createHash } from "node:crypto";
import { getClanDb } from "../../core/database.js";

export interface PluginClanChatRecord {
    sessionId: string;
    accountHash: string;
    rsn: string;
    senderRsn: string;
    world: number;
    kind: string;
    text: string;
    timestampMs: number;
    eventTs: number;
    schemaVersion?: number;
}

function chatDedupHash(record: PluginClanChatRecord): string {
    return createHash("sha1")
        .update(`${record.accountHash}|${record.kind}|${record.senderRsn}|${record.text}|${record.eventTs}`)
        .digest("hex");
}

export function recordPluginClanChat(clanId: string, record: PluginClanChatRecord): boolean {
    const result = getClanDb(clanId)
        .prepare(
            `INSERT INTO clan_chats
                (account_hash, rsn, session_id, session_seq,
                 event_received_at,
                 sender_rsn, kind, text, world,
                 dedup_hash)
             VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(dedup_hash) DO NOTHING`,
        )
        .run(
            record.accountHash,
            record.rsn,
            record.sessionId,
            record.timestampMs,
            record.senderRsn,
            record.kind,
            record.text,
            record.world,
            chatDedupHash(record),
        );
    return result.changes > 0;
}
