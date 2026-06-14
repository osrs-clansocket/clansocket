import { createHash, randomBytes } from "node:crypto";
import { DB_NAMES, getDb } from "../../database/index.js";

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LEN = 16;
const BACKUP_CODE_GROUP = 4;
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface BackupCodeMeta {
    generatedAt: number;
    totalCount: number;
    remainingCount: number;
}

function encode(buf: Buffer): string {
    let out = "";
    for (const byte of buf) {
        out += BACKUP_CODE_ALPHABET[byte % BACKUP_CODE_ALPHABET.length];
    }
    return out;
}

function formatHumanReadable(raw: string): string {
    const groups: string[] = [];
    for (let i = 0; i < raw.length; i += BACKUP_CODE_GROUP) {
        groups.push(raw.slice(i, i + BACKUP_CODE_GROUP));
    }
    return groups.join("-");
}

function hashCode(code: string): string {
    return createHash("sha256").update(code.replaceAll("-", "").toUpperCase()).digest("hex");
}

function generateOneCode(): string {
    return formatHumanReadable(encode(randomBytes(BACKUP_CODE_LEN)).slice(0, BACKUP_CODE_LEN));
}

export function generateBackupCodes(siteAccountId: string): string[] {
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const codes: string[] = [];
    const insertedHashes = new Set<string>();

    db.transaction(() => {
        db.prepare(`DELETE FROM clansocket_backup_codes WHERE site_account_id = ?`).run(siteAccountId);
        while (codes.length < BACKUP_CODE_COUNT) {
            const raw = generateOneCode();
            const hash = hashCode(raw);
            if (insertedHashes.has(hash)) continue;
            try {
                db.prepare(
                    `INSERT INTO clansocket_backup_codes (site_account_id, code_hash, generated_at)
                     VALUES (?, ?, ?)`,
                ).run(siteAccountId, hash, now);
                insertedHashes.add(hash);
                codes.push(raw);
            } catch {
                continue;
            }
        }
    })();

    return codes;
}

export function redeemBackupCode(code: string): { siteAccountId: string } | null {
    const hash = hashCode(code);
    const db = getDb(DB_NAMES.APP);
    return db.transaction((): { siteAccountId: string } | null => {
        const row = db
            .prepare(`SELECT id, site_account_id, redeemed_at FROM clansocket_backup_codes WHERE code_hash = ?`)
            .get(hash) as { id: number; site_account_id: string; redeemed_at: number | null } | undefined;
        if (!row) return null;
        if (row.redeemed_at !== null) return null;
        db.prepare(`UPDATE clansocket_backup_codes SET redeemed_at = ? WHERE id = ?`).run(Date.now(), row.id);
        return { siteAccountId: row.site_account_id };
    })();
}

export function getBackupCodeMeta(siteAccountId: string): BackupCodeMeta | null {
    const db = getDb(DB_NAMES.APP);
    const row = db
        .prepare(
            `SELECT COUNT(*) AS total, SUM(CASE WHEN redeemed_at IS NULL THEN 1 ELSE 0 END) AS remaining,
                    MIN(generated_at) AS generated_at
             FROM clansocket_backup_codes WHERE site_account_id = ?`,
        )
        .get(siteAccountId) as { total: number; remaining: number | null; generated_at: number | null };
    if (row.total === 0) return null;
    return {
        generatedAt: row.generated_at ?? 0,
        totalCount: row.total,
        remainingCount: row.remaining ?? 0,
    };
}
