-- discord_draft_change_deps — normalized dependency graph for publish topo-sort
-- (per D23 — PK fix for NULL handling + guild_id added)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: append-only per change_id; one row per dependency edge.
-- CCx-1: guild_id added per D23 (escalated P1 — was missing; all other per-guild tables carry it).
--
-- Per D23 P0 PK fix: original composite PK (change_id, dependency_change_id, dependency_temp_id)
-- allowed phantom duplicates because sqlite NULL != NULL in unique constraints — the DAG topo-sort
-- would iterate phantom edges.
-- Replaced with surrogate id PK + two partial unique indexes (one per dep direction) that handle NULL correctly.
--
-- Either dependency_change_id (intra-draft dep on another draft op) OR dependency_temp_id
-- (dep on a not-yet-resolved temp-id) is set; never both (CHECK enforced).

CREATE TABLE IF NOT EXISTS discord_draft_change_deps (
    dep_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    change_id TEXT NOT NULL,
    dependency_change_id TEXT,
    dependency_temp_id TEXT,
    CHECK (
        (dependency_change_id IS NOT NULL AND dependency_temp_id IS NULL)
        OR
        (dependency_change_id IS NULL AND dependency_temp_id IS NOT NULL)
    )
);

-- Partial unique indexes enforce no-duplicate-deps despite NULL columns (sqlite NULL != NULL workaround per D23)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_discord_draft_change_deps_via_change
ON discord_draft_change_deps (change_id, dependency_change_id)
WHERE dependency_change_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_discord_draft_change_deps_via_temp
ON discord_draft_change_deps (change_id, dependency_temp_id)
WHERE dependency_temp_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discord_draft_change_deps_change
ON discord_draft_change_deps (change_id);

CREATE INDEX IF NOT EXISTS idx_discord_draft_change_deps_target
ON discord_draft_change_deps (dependency_change_id)
WHERE dependency_change_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discord_draft_change_deps_guild
ON discord_draft_change_deps (guild_id);
