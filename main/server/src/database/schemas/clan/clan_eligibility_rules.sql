CREATE TABLE IF NOT EXISTS clan_eligibility_rules (
    id INTEGER PRIMARY KEY,
    rules_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by_site_account_id TEXT
);
