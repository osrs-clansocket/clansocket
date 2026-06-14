-- discord_draft_changes — staged ops within a draft session (per D23 — dedup_hash UNIQUE escalated P0 + op_kind CHECK)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: append-only per session_id; sequence_no orders ops within a session.
-- CCx-1: guild_id required. conflict_kind drives conflict count for publish gate.
-- OQ-8: dependency_temp_ids_json blob REJECTED — dependencies normalized to discord_draft_change_deps child table.
-- DG-6: dedup_hash UNIQUE (escalated to P0 per D23 — without it, network retry on staging a CREATE
-- produces duplicate ops in publish queue → duplicate channel creations against discord).
-- CHECK constraint per op_kind: enforces before/after_json nullability invariants
-- (create: only after; update: both; delete: only before).

CREATE TABLE IF NOT EXISTS discord_draft_changes (
    change_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    op_kind TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id_or_temp TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    conflict_kind TEXT,
    created_at INTEGER NOT NULL,
    dedup_hash TEXT NOT NULL UNIQUE,
    CHECK (
        (op_kind = 'create' AND before_json IS NULL AND after_json IS NOT NULL)
        OR
        (op_kind = 'update' AND before_json IS NOT NULL AND after_json IS NOT NULL)
        OR
        (op_kind = 'delete' AND before_json IS NOT NULL AND after_json IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_discord_draft_changes_session
ON discord_draft_changes (session_id, sequence_no);

CREATE INDEX IF NOT EXISTS idx_discord_draft_changes_target
ON discord_draft_changes (target_kind, target_id_or_temp);

CREATE INDEX IF NOT EXISTS idx_discord_draft_changes_conflicts
ON discord_draft_changes (session_id)
WHERE conflict_kind IS NOT NULL;
