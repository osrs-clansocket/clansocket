import type { Database } from "better-sqlite3";
import { createHash } from "node:crypto";
import { getClanDb } from "../../core/database.js";
import { dispatchAutoHooksSafe } from "../projection/auto-hook-dispatcher.js";
import { lookupAccountType } from "./lookup-account-type.js";

const CLAN_CHAT_TRIGGER = "clan_chat";

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

function lookupSenderRank(db: Database, senderRsn: string): string | null {
    const row = db.prepare("SELECT rank FROM clan_members WHERE member_name = ? LIMIT 1").get(senderRsn) as
        | { rank: string | null }
        | undefined;
    return row?.rank ?? null;
}

export function recordPluginClanChat(clanId: string, record: PluginClanChatRecord): boolean {
    const db = getClanDb(clanId);
    const result = db
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
    if (result.changes > 0) {
        const rank = lookupSenderRank(db, record.senderRsn);
        const accountType = lookupAccountType(clanId, record.senderRsn);
        dispatchAutoHooksSafe({
            clanId,
            triggerType: CLAN_CHAT_TRIGGER,
            rsn: record.senderRsn,
            payload: {
                rsn: record.senderRsn,
                senderRsn: record.senderRsn,
                rank,
                accountType,
                message: record.text,
                kind: record.kind,
                world: record.world,
            },
        });
    }
    return result.changes > 0;
}
