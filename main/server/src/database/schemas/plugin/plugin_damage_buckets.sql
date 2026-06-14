CREATE TABLE IF NOT EXISTS plugin_damage_buckets (
    account_hash TEXT NOT NULL,
    rsn TEXT,
    source_kind TEXT NOT NULL,
    source_id INTEGER NOT NULL DEFAULT 0,
    source_name TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id INTEGER NOT NULL DEFAULT 0,
    target_name TEXT NOT NULL,
    hitsplat_type INTEGER NOT NULL DEFAULT 0,
    damage_type TEXT NOT NULL DEFAULT 'UNKNOWN',
    minute_bucket INTEGER NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT 0,
    dealt_total INTEGER NOT NULL DEFAULT 0,
    taken_total INTEGER NOT NULL DEFAULT 0,
    hit_count_dealt INTEGER NOT NULL DEFAULT 0,
    hit_count_taken INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (
        account_hash,
        source_kind,
        source_id,
        source_name,
        target_kind,
        target_id,
        target_name,
        hitsplat_type,
        damage_type,
        minute_bucket
    )
);

CREATE INDEX IF NOT EXISTS idx_plugin_damage_buckets_bucket ON plugin_damage_buckets (minute_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_damage_buckets_target ON plugin_damage_buckets (
    account_hash, target_name, minute_bucket DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_damage_buckets_target_id ON plugin_damage_buckets (
    account_hash, target_id, minute_bucket DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_damage_buckets_source ON plugin_damage_buckets (
    account_hash, source_name, minute_bucket DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_damage_buckets_source_id ON plugin_damage_buckets (
    account_hash, source_id, minute_bucket DESC
);
