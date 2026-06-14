-- Operational metadata only. User-visible content (instruction, message) is
-- the user's data and stays in their browser localStorage — not persisted on
-- the backend. AI's in-memory active chain still carries that content for
-- prompt assembly during a request; once the chain completes, only the
-- structural / audit trail below survives.
CREATE TABLE IF NOT EXISTS varez_chain_turns (
    site_account_id TEXT NOT NULL,
    chain_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    mode TEXT NOT NULL,
    loaded_context TEXT NOT NULL,
    reads TEXT NOT NULL,
    queries TEXT NOT NULL,
    recap TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    PRIMARY KEY (site_account_id, chain_id, step)
);

CREATE INDEX IF NOT EXISTS idx_varez_chain_turns_recent ON varez_chain_turns (site_account_id, started_at DESC);
