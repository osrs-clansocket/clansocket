import { getDb, DB_NAMES } from "../../database/index.js";
import { MS_PER_MINUTE } from "../../shared/time.js";

interface GateResult {
    allowed: boolean;
    reason: string | null;
    remainingSeconds: number;
}

interface CooldownEntry {
    action: string;
    target: string;
    cooldown_minutes: number;
    executed_at: number;
    remaining_seconds: number;
}

const DEFAULT_COOLDOWN_MINUTES = 5;

function normalizeTarget(target: string): string {
    return target.toLowerCase().trim();
}

function check(siteAccountId: string, action: string, target = ""): GateResult {
    const norm = normalizeTarget(target);
    const db = getDb(DB_NAMES.AI);
    const row = db
        .prepare(
            "SELECT cooldown_minutes, executed_at FROM varez_user_action_log WHERE site_account_id = ? AND action = ? AND target = ?",
        )
        .get(siteAccountId, action, norm) as { cooldown_minutes: number; executed_at: number } | undefined;

    if (!row) return { allowed: true, reason: null, remainingSeconds: 0 };

    const elapsed = Date.now() - row.executed_at;
    const cooldownMs = row.cooldown_minutes * MS_PER_MINUTE;
    const remaining = cooldownMs - elapsed;

    if (remaining <= 0) return { allowed: true, reason: null, remainingSeconds: 0 };

    const remainingSeconds = Math.ceil(remaining / 1000);
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const label = norm ? `${action}:${norm}` : action;

    return {
        allowed: false,
        reason: `"${label}" is on cooldown. Available in ${timeStr}.`,
        remainingSeconds,
    };
}

function record(siteAccountId: string, action: string, target = "", cooldownMinutes = DEFAULT_COOLDOWN_MINUTES): void {
    const norm = normalizeTarget(target);
    getDb(DB_NAMES.AI)
        .prepare(
            "INSERT OR REPLACE INTO varez_user_action_log (site_account_id, action, target, cooldown_minutes, executed_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(siteAccountId, action, norm, cooldownMinutes, Date.now());
}

function cleanup(siteAccountId: string): void {
    const db = getDb(DB_NAMES.AI);
    const rows = db
        .prepare(
            "SELECT action, target, cooldown_minutes, executed_at FROM varez_user_action_log WHERE site_account_id = ?",
        )
        .all(siteAccountId) as {
        action: string;
        target: string;
        cooldown_minutes: number;
        executed_at: number;
    }[];
    const del = db.prepare("DELETE FROM varez_user_action_log WHERE site_account_id = ? AND action = ? AND target = ?");
    for (const row of rows) {
        const elapsed = Date.now() - row.executed_at;
        if (elapsed > row.cooldown_minutes * MS_PER_MINUTE) {
            del.run(siteAccountId, row.action, row.target);
        }
    }
}

function getActiveCooldowns(siteAccountId: string): CooldownEntry[] {
    cleanup(siteAccountId);
    const rows = getDb(DB_NAMES.AI)
        .prepare(
            "SELECT action, target, cooldown_minutes, executed_at FROM varez_user_action_log WHERE site_account_id = ?",
        )
        .all(siteAccountId) as {
        action: string;
        target: string;
        cooldown_minutes: number;
        executed_at: number;
    }[];

    return rows
        .map((row) => {
            const elapsed = Date.now() - row.executed_at;
            const remaining = row.cooldown_minutes * MS_PER_MINUTE - elapsed;
            return { ...row, remaining_seconds: Math.ceil(remaining / 1000) };
        })
        .filter((r) => r.remaining_seconds > 0);
}

function formatCooldowns(siteAccountId: string): string {
    const active = getActiveCooldowns(siteAccountId);
    if (active.length === 0) return "No active cooldowns.";
    const lines = ["Active cooldowns (do not attempt these actions):"];
    for (const c of active) {
        const mins = Math.floor(c.remaining_seconds / 60);
        const secs = c.remaining_seconds % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const label = c.target ? `${c.action}:${c.target}` : c.action;
        lines.push(`  - ${label} — available in ${timeStr}`);
    }
    return lines.join("\n");
}

export const actionGate = { check, record, cleanup, getActiveCooldowns, formatCooldowns };
