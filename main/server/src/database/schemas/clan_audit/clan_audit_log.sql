CREATE TABLE IF NOT EXISTS clan_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    actor_site_account_id TEXT,
    actor_kind TEXT NOT NULL DEFAULT 'user',
    action TEXT NOT NULL,
    source TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    target_type TEXT,
    target_id TEXT,
    target_name TEXT,
    guild_id TEXT,
    payload_json TEXT,
    session_id TEXT,
    seq INTEGER,
    request_id TEXT,
    elapsed_ms INTEGER,
    prev_hash TEXT,
    row_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_clan_audit_log_ts ON clan_audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_action ON clan_audit_log (action, ts DESC);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_actor ON clan_audit_log (actor_site_account_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_target ON clan_audit_log (target_type, target_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_session_seq ON clan_audit_log (session_id, seq);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_request ON clan_audit_log (request_id);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_row_hash ON clan_audit_log (row_hash);
CREATE INDEX IF NOT EXISTS idx_clan_audit_log_guild ON clan_audit_log (guild_id, ts DESC) WHERE guild_id IS NOT NULL;
