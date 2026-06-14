import { DB_NAMES, getDb } from "../../../database/index.js";
import { HISTORY_LIMIT, type Chain, type ChainStep } from "./types.js";

// Persists only operational metadata. `instruction` + `message` are the user's
// own content and live in their browser localStorage — NOT in the backend db.
// The in-memory `chain` and `step` carry that content during request handling
// for prompt assembly; nothing of it survives on disk after the chain ends.
export function persistStep(siteAccountId: string, chain: Chain, step: ChainStep): void {
    const db = getDb(DB_NAMES.AI);
    db.prepare(
        `INSERT OR REPLACE INTO varez_chain_turns (
            site_account_id, chain_id, step, mode,
            loaded_context, reads, queries, recap,
            started_at, completed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        siteAccountId,
        chain.id,
        step.step,
        chain.mode,
        JSON.stringify(step.loadedContext),
        JSON.stringify(step.reads),
        JSON.stringify(step.queries),
        step.recap ? JSON.stringify(step.recap) : null,
        chain.startedAt,
        null,
    );
}

export function trimHistory(siteAccountId: string): void {
    const db = getDb(DB_NAMES.AI);
    const rows = db
        .prepare(
            `SELECT chain_id, MAX(started_at) AS started_at
             FROM varez_chain_turns
             WHERE site_account_id = ?
             GROUP BY chain_id
             ORDER BY started_at DESC`,
        )
        .all(siteAccountId) as { chain_id: string; started_at: number }[];
    if (rows.length <= HISTORY_LIMIT) return;
    const toDelete = rows.slice(HISTORY_LIMIT).map((r) => r.chain_id);
    const del = db.prepare("DELETE FROM varez_chain_turns WHERE site_account_id = ? AND chain_id = ?");
    db.transaction(() => {
        for (const chainId of toDelete) del.run(siteAccountId, chainId);
    })();
}

export function markCompleted(siteAccountId: string, chainId: string, completedAt: number): void {
    const db = getDb(DB_NAMES.AI);
    db.prepare("UPDATE varez_chain_turns SET completed_at = ? WHERE site_account_id = ? AND chain_id = ?").run(
        completedAt,
        siteAccountId,
        chainId,
    );
}
