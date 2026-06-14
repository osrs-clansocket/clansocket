// Declarative per-table field-rule data for sql-schema-constitution.md.
// Consumed by build-schema-constitution.mjs to populate FIELDS / INDEX / PK blocks.
//
// Shape:
//   rules[tableName] = {
//     pk: ["col1", "col2"],
//     pkAutoIncr: true,                                       // optional, for AUTOINCREMENT pk
//     fields: { colName: { type, axis, pair?, src?, note? } },
//     indexes: ["(col1, col2 DESC)", "(col3) WHERE col3 IS NOT NULL"],
//   }
//
// Conventions:
//   - All cols required for the table must be present in `fields` (matches checklist tree).
//   - `type` is the SQL type fragment including NOT NULL / NULL where applicable.
//   - `axis` is the W/W/W/W/Delta tag (WHO-id, WHO-name, WHAT-id, WHAT-name, WHERE-world,
//      WHERE-spatial, WHERE-region, WHERE-area, WHEN, WHEN-bucket, DELTA-qty, DELTA-before,
//      DELTA-after, DELTA-state, DELTA-attr, row-id, session-group, STATE-only, COUNTER,
//      ENUM-id+name, FK).
//   - `pair` names the sibling col that paired-doctrine fetches together (denormalization invariant).
//   - `src` describes provenance: `<Protocol>.field` | `<catalog> JOIN @ write` | `server-gen=...`
//   - `note` adds conditional info (NULL-when rules, sign conventions, etc).

// ─────────────────────────────────────────────────────────────────────
// SHARED FIELD TEMPLATES — reused across tables
// ─────────────────────────────────────────────────────────────────────
const WHO = {
    account_hash: { type: "TEXT NOT NULL", axis: "WHO-id", pair: "rsn", src: "Identity.accountHash (plugin handshake; denormalized per-row)" },
    rsn: { type: "TEXT NOT NULL", axis: "WHO-name", pair: "account_hash", src: "Identity.rsn (plugin handshake; denormalized per-row)" },
};

const ID_AUTOINCR = { type: "INTEGER NOT NULL", axis: "row-id", src: "server-gen (AUTOINCREMENT)" };

const SPATIAL_REQUIRED = {
    world: { type: "INTEGER NOT NULL", axis: "WHERE-world", src: "Identity.world / client.getWorld()" },
    x: { type: "INTEGER NOT NULL", axis: "WHERE-spatial", src: "LocationContext.capture().x" },
    y: { type: "INTEGER NOT NULL", axis: "WHERE-spatial", src: "LocationContext.capture().y" },
    plane: { type: "INTEGER NOT NULL", axis: "WHERE-spatial", src: "LocationContext.capture().plane" },
    region_id: { type: "INTEGER NOT NULL", axis: "WHERE-region", pair: "region_name", src: "LocationContext.capture().regionId" },
    region_name: { type: "TEXT NOT NULL", axis: "WHERE-region", pair: "region_id", src: "region-id-to-name lookup" },
    area: { type: "TEXT NULL", axis: "WHERE-area", src: "LocationContext.capture().area" },
};

const SPATIAL_OPTIONAL = {
    world: { type: "INTEGER NULL", axis: "WHERE-world", src: "Identity.world" },
    x: { type: "INTEGER NULL", axis: "WHERE-spatial", src: "LocationContext.capture().x" },
    y: { type: "INTEGER NULL", axis: "WHERE-spatial", src: "LocationContext.capture().y" },
    plane: { type: "INTEGER NULL", axis: "WHERE-spatial", src: "LocationContext.capture().plane" },
    region_id: { type: "INTEGER NULL", axis: "WHERE-region", pair: "region_name", src: "LocationContext.capture().regionId" },
    region_name: { type: "TEXT NULL", axis: "WHERE-region", pair: "region_id", src: "region-id-to-name lookup" },
    area: { type: "TEXT NULL", axis: "WHERE-area", src: "LocationContext.capture().area" },
};

const WHEN_SERVER = { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now()" };
const WHEN_UPDATED = { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at content mutation (gated by CASE in writer)" };
const WHEN_FIRST_SEEN = { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at first observation" };
const WHEN_LAST_SEEN = { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at every observation" };
const STATE_LIFECYCLE = {
    first_seen: WHEN_FIRST_SEEN,
    last_seen: WHEN_LAST_SEEN,
    updated_at: WHEN_UPDATED,
};

// ─────────────────────────────────────────────────────────────────────
// CANONICAL EVENT-ROW UNIFORM BLOCKS — every plugin-emitted event table
// carries these in fixed positions per APPENDIX C of the checklist.
// ─────────────────────────────────────────────────────────────────────
const SESSION_ORDER = {
    session_id: { type: "TEXT NOT NULL", axis: "session-group", src: "active plugin ws session uuid (Identity handshake; server-tracked per connection)" },
    session_seq: { type: "INTEGER NOT NULL", axis: "session-monotonic", src: "Batch.seq lifted at ingest (Batch envelope already carries per-session monotonic counter; resets on LOGIN_SCREEN per EventBatcher.java)" },
};

const TIME_STAGES = {
    event_received_at: { type: "INTEGER NOT NULL", axis: "WHEN-receive", src: "server Date.now() at ws-message receive" },
};

const PROVENANCE = {
    plugin_version: { type: "TEXT NOT NULL", axis: "provenance", src: "plugin_sessions.plugin_version lookup by session_id (denormalized per-row at write); 'unknown' when session row absent" },
};

const DEDUP = {
    dedup_hash: { type: "TEXT NOT NULL", axis: "idempotency", note: "server-computed semantic hash; excludes timestamps", src: "server rowDedupHash(account_hash + payload_kind + entity_ids + delta_values + session_seq + spatial)" },
};

// Build a _changes-row template (canonical APPENDIX C shape).
// Field insertion order matches the canonical column order — every event-shaped
// table built via this template emits cols in the same fixed sequence.
function changesTemplate({ entity_id_col, entity_id_type, entity_name_col, entity_name_type, entity_id_src, entity_name_src, entity_pair_kind = "pair", delta = {}, cause = {}, extras = {}, withUnitPrice = false, spatialOptional = false }) {
    const base = {
        // row-id (id is conventionally first; placed before WHO so PK col leads)
        id: ID_AUTOINCR,
        // WHO
        ...WHO,
        // session + ordering
        ...SESSION_ORDER,
        // server receive time
        ...TIME_STAGES,
        // provenance
        ...PROVENANCE,
    };
    // 11-12: WHAT (entity_id + entity_name, or single enum-as-id+name)
    if (entity_id_col) {
        base[entity_id_col] = {
            type: entity_id_type || "INTEGER NOT NULL",
            axis: entity_pair_kind === "enum" ? "ENUM-id+name" : "WHAT-id",
            pair: entity_pair_kind === "enum" ? null : entity_name_col,
            src: entity_id_src,
        };
    }
    if (entity_name_col && entity_pair_kind !== "enum") {
        base[entity_name_col] = {
            type: entity_name_type || "TEXT NOT NULL",
            axis: "WHAT-name",
            pair: entity_id_col,
            src: entity_name_src,
        };
    }
    // 13: extras (domain-specific WHAT-extension cols like container_kind+slot, source_kind, category)
    Object.assign(base, extras);
    // 14: delta cols
    Object.assign(base, delta);
    if (withUnitPrice) {
        base.unit_price_gp = { type: "INTEGER NULL", axis: "DELTA-attr", src: "plugin_items_catalog.price_gp JOIN @ write" };
    }
    // 15: cause cols (cause_kind / cause_id / cause_name / ...)
    Object.assign(base, cause);
    // WHERE (spatial — NOT NULL by default, NULL for transition-style events)
    Object.assign(base, spatialOptional ? SPATIAL_OPTIONAL : SPATIAL_REQUIRED);
    // dedup (last; server-computed from semantic payload only)
    Object.assign(base, DEDUP);
    return base;
}

// ─────────────────────────────────────────────────────────────────────
// RULES — one entry per NEW/REWRITE/EXTEND table
// ─────────────────────────────────────────────────────────────────────
export const rules = {
    // ═══════════════ clan.db ═══════════════
    clan_chats: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            extras: {
                sender_rsn: { type: "TEXT NULL", axis: "WHO-name (sender)", src: "ChatPayload.senderRsn" },
                kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "chat message kind enum from ChatPayload.kind (query SELECT DISTINCT kind for actuals)", src: "ChatPayload.kind" },
                text: { type: "TEXT NOT NULL", axis: "content", src: "ChatPayload.text" },
            },
            spatialOptional: true,
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(event_received_at DESC)",
            "(sender_rsn, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    clan_member_history: {
        pk: ["account_hash", "clan_id"],
        fields: {
            ...WHO,
            clan_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "clan_name", src: "clansocket_clans.id JOIN @ write" },
            clan_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "clan_id", src: "Identity.clanName / clansocket_clans.display_name" },
            rank: { type: "TEXT NULL", axis: "ENUM-id+name", note: "clan rank label (per-clan custom labels OR default rank ladder; from Identity.clanRank — query SELECT DISTINCT rank for the active clan's actuals)", src: "Identity.clanRank" },
            joined_at: { type: "TEXT NULL", axis: "WHEN", src: "Identity.clanJoinedAt (plugin-reported clan join time)" },
            first_seen: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at first observation" },
            last_seen: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at every observation" },
        },
        indexes: [
            "(account_hash)",
            "(clan_id, last_seen DESC)",
        ],
    },
    clan_snapshots: {
        pk: ["account_hash", "observed_at"],
        fields: {
            ...WHO,
            clan_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "clan_name", src: "clansocket_clans.id JOIN @ write" },
            clan_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "clan_id", src: "Identity.clanName" },
            member_count: { type: "INTEGER NOT NULL", axis: "COUNTER", src: "Identity.clanMemberCount" },
            online_count: { type: "INTEGER NOT NULL", axis: "COUNTER", src: "Identity.clanOnlineCount" },
            observed_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now()" },
        },
        indexes: [
            "(clan_id, observed_at DESC)",
            "(account_hash, observed_at DESC)",
        ],
    },
    clan_titles_current: {
        pk: ["clan_id", "rank_position"],
        fields: {
            ...WHO,
            clan_id: { type: "TEXT NOT NULL", axis: "WHAT-id", pair: "clan_name", src: "clansocket_clans.id JOIN @ write" },
            clan_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "clan_id", src: "ClanTitlesSnapshot.clanName" },
            rank_position: { type: "INTEGER NOT NULL", axis: "ENUM-id+name", note: "rank slot index (numeric position in clan title list)", src: "ClanTitleEntry.rank" },
            title_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "title_name", src: "ClanTitleEntry.titleId" },
            title_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "title_id", src: "ClanTitleEntry.title" },
            observed_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now()" },
        },
        indexes: [
            "(clan_id, rank_position)",
        ],
    },
    clan_titles_history: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "clan_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "clan_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "clansocket_clans.id JOIN @ write",
            entity_name_src: "ClanTitlesSnapshot.clanName",
            extras: {
                rank_position: { type: "INTEGER NOT NULL", axis: "ENUM-id+name", note: "rank slot index", src: "ClanTitleEntry.rank" },
            },
            delta: {
                old_title_id: { type: "INTEGER NULL", axis: "DELTA-before (id)", pair: "old_title_name", src: "prior clan_titles_current.title_id at same rank_position (server-derived)" },
                old_title_name: { type: "TEXT NULL", axis: "DELTA-before (name)", pair: "old_title_id", src: "prior clan_titles_current.title_name (server-derived)" },
                new_title_id: { type: "INTEGER NOT NULL", axis: "DELTA-after (id)", pair: "new_title_name", src: "ClanTitleEntry.titleId" },
                new_title_name: { type: "TEXT NOT NULL", axis: "DELTA-after (name)", pair: "new_title_id", src: "ClanTitleEntry.title" },
            },
            spatialOptional: true,
        }),
        indexes: [
            "(session_id, session_seq)",
            "(clan_id, event_received_at DESC)",
            "(account_hash, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },

    // ═══════════════ clan_audit.db ═══════════════
    clan_audit_log: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: {
            id: ID_AUTOINCR,
            ts: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at action" },
            actor_site_account_id: { type: "TEXT NULL", axis: "WHO-id (actor)", src: "clansocket_accounts.id of acting user; NULL for system actions" },
            actor_kind: { type: "TEXT NOT NULL DEFAULT 'user'", axis: "ENUM-id+name", note: "audit actor kind enum (initiator classification — query SELECT DISTINCT actor_kind for actuals)", src: "audit-writer derives from caller context (express middleware / cron runner / bot dispatch)" },
            action: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "verb (free-form audit action)", src: "audit-writer call site supplies the action verb" },
            source: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "audit source-surface enum (where the action originated — query SELECT DISTINCT source for actuals)", src: "audit-writer derives from request origin (X-Source header / cron job tag / bot command)" },
            schema_version: { type: "INTEGER NOT NULL", axis: "version", src: "compile-time constant" },
            target_type: { type: "TEXT NULL", axis: "ENUM-id+name", note: "audit target entity kind enum (free-form classification supplied at call site — query SELECT DISTINCT target_type for actuals)", src: "audit-writer call site supplies target classification" },
            target_id: { type: "TEXT NULL", axis: "WHAT-id", pair: "target_name", src: "audit-writer call site (id of target entity)" },
            target_name: { type: "TEXT NULL", axis: "WHAT-name", pair: "target_id", src: "denormalized via target_type-keyed lookup @ write" },
            payload_json: { type: "TEXT NULL", axis: "content", note: "JSON envelope of action-specific data", src: "audit-writer call site supplies action-specific payload" },
            session_id: { type: "TEXT NULL", axis: "session-group", src: "request session id" },
            seq: { type: "INTEGER NULL", axis: "row-id (within session)", src: "monotonic counter per session" },
            request_id: { type: "TEXT NULL", axis: "request-trace-id", src: "express middleware adds per-request UUID; cron/bot supply their own" },
            elapsed_ms: { type: "INTEGER NULL", axis: "DELTA-attr", src: "server-gen=action duration" },
            prev_hash: { type: "TEXT NULL", axis: "chain-hash", src: "row_hash of previous audit row" },
            row_hash: { type: "TEXT NULL", axis: "chain-hash", src: "server-gen=hash(prev_hash + canonical row fields)" },
        },
        indexes: [
            "(ts DESC)",
            "(action, ts DESC)",
            "(actor_site_account_id, ts DESC)",
            "(target_type, target_id, ts DESC)",
            "(session_id, seq)",
            "(request_id)",
            "(row_hash)",
        ],
    },

    // ═══════════════ clansocket.db ═══════════════
    clansocket_account_rsns: {
        pk: ["account_hash", "rsn"],
        fields: {
            ...WHO,
            source: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "rsn upsert origin enum (CHECK-constrained; set by upsert call site — query SELECT DISTINCT source for actuals)", src: "rsn upsert call site" },
            current_rank: { type: "TEXT NULL", axis: "ENUM-id+name", src: "Identity.clanRank at verification time" },
            first_seen: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at first observation of (account_hash, rsn)" },
            last_seen: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at every observation" },
            verified_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at plugin-hello verification" },
        },
        indexes: [
            "(account_hash, last_seen DESC)",
            "(rsn, last_seen DESC)",
        ],
    },
    clansocket_clan_manager_requests: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: {
            site_account_id: { type: "TEXT NOT NULL", axis: "WHO-id (requester)", src: "clansocket_accounts.id" },
            declared_account_hash: { type: "TEXT NOT NULL", axis: "WHO-id (declared)", pair: "declared_rsn", src: "user-declared plugin account hash" },
            declared_rsn: { type: "TEXT NOT NULL", axis: "WHO-name (declared)", pair: "declared_account_hash", src: "manager-request submission form (user-declared)" },
            id: ID_AUTOINCR,
            clan_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "clan_name", src: "clansocket_clans.id" },
            clan_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "clan_id", src: "clansocket_clans.display_name JOIN @ write" },
            clan_slug: { type: "TEXT NOT NULL", axis: "WHAT-slug", pair: "clan_id", src: "clansocket_clans.slug JOIN @ write" },
            plugin_verified: { type: "INTEGER NOT NULL DEFAULT 0", axis: "FLAG", note: "1=plugin observation matches declared rsn", src: "server-derived from plugin handshake history (does declared_account_hash have an active plugin_sessions row with declared_rsn?)" },
            source: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "request origin surface enum (query SELECT DISTINCT source for actuals)", src: "request origin (X-Source header / api endpoint / bot command path)" },
            status: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "manager-request lifecycle status enum (query SELECT DISTINCT status for actuals)", src: "lifecycle state set at submission; transitions via approval endpoint or cron expiry" },
            requested_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at submission" },
            resolved_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() when status transitions out of pending" },
            resolved_by_site_account_id: { type: "TEXT NULL", axis: "WHO-id (resolver)", src: "clansocket_accounts.id of approver/denier" },
        },
        indexes: [
            "(clan_id, status)",
            "(site_account_id, status)",
            "UNIQUE (clan_id, declared_account_hash) WHERE status = 'pending'",
        ],
    },
    clansocket_clan_managers: {
        pk: ["site_account_id", "clan_id"],
        fields: {
            site_account_id: { type: "TEXT NOT NULL", axis: "WHO-id (manager)", src: "clansocket_accounts.id" },
            granted_by_site_account_id: { type: "TEXT NULL", axis: "WHO-id (granter)", src: "clansocket_accounts.id of approver" },
            clan_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "clan_name", src: "clansocket_clans.id" },
            clan_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "clan_id", src: "clansocket_clans.display_name JOIN @ write" },
            role: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "clan-manager role tier enum (query SELECT DISTINCT role for actuals)", src: "grant call site supplies role" },
            granted_via: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "manager-grant flow enum (how the role was conferred — query SELECT DISTINCT granted_via for actuals)", src: "grant call site indicates the granting flow" },
            granted_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at grant" },
            revoked_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at revocation" },
        },
        indexes: [
            "(clan_id, role)",
            "(site_account_id)",
        ],
    },
    clansocket_clan_whitelists: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: {
            id: ID_AUTOINCR,
            clan_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "clan_name", src: "clansocket_clans.id" },
            clan_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "clan_id", src: "clansocket_clans.display_name JOIN @ write" },
            entry_kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "whitelist entry kind enum (which identifier-kind the value represents — query SELECT DISTINCT entry_kind for actuals)", src: "clan-manager whitelist submission form" },
            entry_value: { type: "TEXT NOT NULL", axis: "WHAT-id", note: "concrete value matching entry_kind", src: "clan-manager whitelist submission form" },
            label: { type: "TEXT NULL", axis: "WHAT-name", note: "human-readable label for the whitelist entry", src: "clan-manager whitelist submission form (optional)" },
            added_by_site_account_id: { type: "TEXT NOT NULL", axis: "WHO-id (adder)", src: "express middleware auth → req.siteAccountId" },
            added_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now()" },
            revoked_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at removal" },
        },
        indexes: [
            "(clan_id, entry_kind, entry_value)",
            "(entry_kind, entry_value)",
        ],
    },
    clansocket_data_action_log: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: {
            site_account_id: { type: "TEXT NOT NULL", axis: "WHO-id (actor)", src: "express middleware auth → req.siteAccountId" },
            id: ID_AUTOINCR,
            kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "data-rights action verb enum (route-keyed by endpoint dispatch — query SELECT DISTINCT kind for actuals)", src: "data-rights endpoint dispatch (route-keyed)" },
            target_id: { type: "TEXT NULL", axis: "WHAT-id", pair: "target_name", src: "data-rights action call site (target of the operation, e.g. clan_id for clan-leave)" },
            target_name: { type: "TEXT NULL", axis: "WHAT-name", pair: "target_id", src: "denormalized via kind-keyed lookup @ write" },
            performed_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now()" },
        },
        indexes: [
            "(site_account_id, performed_at DESC)",
            "(kind, performed_at DESC)",
        ],
    },

    // ═══════════════ plugin-<mode>.db — STATE tables (item-bag) ═══════════════
    plugin_bank: {
        pk: ["account_hash", "item_id"],
        tableNote: "captured during bank-widget-open sessions only (plugin limit). updated_at bumps only when qty / item_name / unit_price_gp actually change. plugin_bank_changes rows emit on BankClose, one per item changed.",
        fields: {
            ...WHO,
            item_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "item_name", src: "BankOpen.items[].id" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "plugin_items_catalog JOIN @ write" },
            qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "BankOpen.items[].qty" },
            unit_price_gp: { type: "INTEGER NULL", axis: "DELTA-attr", src: "plugin_items_catalog.price_gp JOIN @ write" },
            slot: { type: "INTEGER NULL", axis: "WHAT-attr", note: "bank container slot index (in-game position)", src: "BankOpen/BankClose items[].slot (container index)" },
            bank_tab: { type: "INTEGER NULL", axis: "WHAT-attr", note: "bank tab 1-9, 0=unfiled/main", src: "BankSessionTracker bankTabBoundaries() over VarbitID.BANK_TAB_1..9" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
            "(account_hash, bank_tab, slot)",
        ],
    },
    plugin_bank_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "item_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "item_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "BankClose.changes[].id",
            entity_name_src: "plugin_items_catalog JOIN @ write",
            withUnitPrice: true,
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+deposit / -withdraw", src: "BankClose.changes[].qty (signed)" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, item_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_inventory: {
        pk: ["account_hash", "container_kind", "slot"],
        fields: {
            ...WHO,
            container_kind: { type: "TEXT NOT NULL DEFAULT 'MAIN'", axis: "ENUM-id+name", note: "inventory container-kind enum (subspace discriminator — query SELECT DISTINCT container_kind for actuals)", src: "ContainerTracker dispatch / RunePouchTracker dispatch" },
            slot: { type: "INTEGER NOT NULL", axis: "WHAT-attr", note: "container slot index (MAIN 0-27, RUNE_POUCH 0-5)", src: "Container.items[].slot / RunePouch.slots[].slot" },
            item_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "item_name", src: "Container.items[].id (slot-keyed full snapshot)" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "plugin_items_catalog JOIN @ write" },
            qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", note: "qty held at this slot; state rebuilt from full slot snapshot on each change", src: "Container.items[].qty (full slot snapshot)" },
            unit_price_gp: { type: "INTEGER NULL", axis: "DELTA-attr", src: "plugin_items_catalog.price_gp JOIN @ write" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
            "(account_hash, container_kind)",
            "(account_hash, item_id)",
        ],
    },
    plugin_inventory_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "item_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "item_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "ContainerDelta.changes[].id",
            entity_name_src: "plugin_items_catalog JOIN @ write",
            withUnitPrice: true,
            extras: {
                container_kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "inventory container-kind enum (query SELECT DISTINCT container_kind for actuals)", src: "dispatch on containerId / RunePouch payload" },
            },
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+add / -remove", src: "ContainerDelta.changes[].qty (signed)" },
            },
            cause: {
                cause_action: { type: "TEXT NULL", axis: "CAUSE", src: "ContainerDelta.cause.action" },
                cause_option: { type: "TEXT NULL", axis: "CAUSE", src: "ContainerDelta.cause.option" },
                cause_target: { type: "TEXT NULL", axis: "CAUSE", src: "ContainerDelta.cause.target" },
                cause_target_id: { type: "INTEGER NULL", axis: "CAUSE", src: "ContainerDelta.cause.id" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, item_id, event_received_at DESC)",
            "(account_hash, container_kind, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_equipment: {
        pk: ["account_hash", "slot"],
        fields: {
            ...WHO,
            slot: { type: "TEXT NOT NULL", axis: "WHAT-attr", note: "equipment slot enum (RuneLite EquipmentInventorySlot — query SELECT DISTINCT slot for actuals)", src: "EquipmentInventorySlot index->name from Container.items[].slot" },
            item_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "item_name", src: "Container.items[].id (slot-keyed full snapshot)" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "plugin_items_catalog JOIN @ write" },
            qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", note: "qty held at this slot; state rebuilt from full slot snapshot on each change", src: "Container.items[].qty (full slot snapshot)" },
            unit_price_gp: { type: "INTEGER NULL", axis: "DELTA-attr", src: "plugin_items_catalog.price_gp JOIN @ write" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
            "(account_hash, item_id)",
        ],
    },
    plugin_equipment_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "item_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "item_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "ContainerDelta.changes[].id",
            entity_name_src: "plugin_items_catalog JOIN @ write",
            withUnitPrice: true,
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+equip / -unequip", src: "ContainerDelta.changes[].qty (signed)" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, item_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_seed_vault: {
        pk: ["account_hash", "item_id"],
        fields: {
            ...WHO,
            item_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "item_name", src: "Container.items[].id (SEED_VAULT)" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "plugin_items_catalog JOIN @ write" },
            qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "Container.items[].qty" },
            unit_price_gp: { type: "INTEGER NULL", axis: "DELTA-attr", src: "plugin_items_catalog.price_gp JOIN @ write" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
        ],
    },
    plugin_seed_vault_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "item_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "item_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "ContainerDelta.changes[].id (SEED_VAULT)",
            entity_name_src: "plugin_items_catalog JOIN @ write",
            withUnitPrice: true,
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+deposit / -withdraw", src: "ContainerDelta.changes[].qty (signed)" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, item_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_collection_log: {
        pk: ["account_hash", "item_id"],
        fields: {
            ...WHO,
            item_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "item_name", src: "CollectionLogSnapshot.Item.itemId" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "CollectionLogSnapshot.Item.name / plugin_items_catalog JOIN @ write" },
            category: { type: "TEXT NOT NULL", axis: "WHAT-section", note: "collection-log widget section hierarchy (Section/Subsection format from CollectionLogSnapshot.Item.category — query SELECT DISTINCT category for actuals)", src: "CollectionLogSnapshot.Item.category" },
            qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "CollectionLogSnapshot.Item.quantity" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
            "(account_hash, category)",
        ],
    },
    plugin_collection_log_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "item_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "item_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "CollectionLogEntry.itemId",
            entity_name_src: "CollectionLogEntry.itemName / plugin_items_catalog JOIN @ write",
            extras: {
                category: { type: "TEXT NOT NULL", axis: "WHAT-section", note: "widget section hierarchy", src: "CollectionLogEntry.category" },
                source_kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "collection-log source-kind enum (how the entry was obtained — query SELECT DISTINCT source_kind for actuals)", src: "CollectionLogEntry.sourceKind" },
            },
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+1 per new entry", src: "server-gen=+1 per CollectionLogEntry" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, item_id, event_received_at DESC)",
            "(account_hash, category, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },

    // ═══════════════ plugin-<mode>.db — STATS / PRAYERS / BOOSTS ═══════════════
    plugin_stats: {
        pk: ["account_hash", "skill"],
        fields: {
            ...WHO,
            skill: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "OSRS skill enum (uppercase per-skill names + an aggregate label — query SELECT DISTINCT skill for actuals)", src: "Stats.skills[].name / StatChanged.skill" },
            level: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "Stats.skills[].level / StatChanged.level" },
            boosted: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "Stats.skills[].boosted" },
            xp: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "Stats.skills[].xp / XpGained.xp" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
        ],
    },
    plugin_stats_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        tableNote: "source for both xp time-series AND level-ups — group by (event_received_at / 3600000) for hourly buckets; filter level_after > level_before for level-up events.",
        fields: changesTemplate({
            entity_id_col: "skill", entity_id_type: "TEXT NOT NULL",
            entity_name_col: null,
            entity_pair_kind: "enum",
            entity_id_src: "StatChanged.skill / XpGained.skill",
            delta: {
                level_before: { type: "INTEGER NOT NULL", axis: "DELTA-before", src: "prior plugin_stats.level (server-derived)" },
                level_after: { type: "INTEGER NOT NULL", axis: "DELTA-after", src: "StatChanged.level" },
                xp_before: { type: "INTEGER NOT NULL", axis: "DELTA-before", src: "prior plugin_stats.xp (server-derived) / LevelUp.xpBefore" },
                xp_after: { type: "INTEGER NOT NULL", axis: "DELTA-after", src: "Stats.skills[].xp / XpGained.xp" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, skill, event_received_at DESC)",
            "(account_hash, skill, event_received_at DESC) WHERE level_after > level_before",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_prayers: {
        pk: ["account_hash", "prayer_id"],
        fields: {
            ...WHO,
            prayer_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "prayer_name", src: "Prayers.active[].id" },
            prayer_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "prayer_id", src: "Prayers.active[].name" },
            active: { type: "INTEGER NOT NULL DEFAULT 0", axis: "DELTA-state", note: "1=active, 0=inactive", src: "Prayers.active[] membership" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash, active)",
        ],
    },
    plugin_prayers_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "prayer_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "prayer_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "Prayers.active[].id",
            entity_name_src: "Prayers.active[].name",
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+1 activate / -1 deactivate", src: "server-derived from Prayers.active diff" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, prayer_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_boosts: {
        pk: ["account_hash", "skill"],
        fields: {
            ...WHO,
            skill: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "OSRS skill enum (uppercase per-skill names + an aggregate label — query SELECT DISTINCT skill for actuals)", src: "Boosts.entries[].skill" },
            diff: { type: "INTEGER NOT NULL", axis: "DELTA-state", note: "boost delta (negative=drain)", src: "Boosts.entries[].diff" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
        ],
    },
    plugin_boosts_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "skill", entity_id_type: "TEXT NOT NULL",
            entity_name_col: null,
            entity_pair_kind: "enum",
            entity_id_src: "Boosts.entries[].skill",
            delta: {
                diff_before: { type: "INTEGER NOT NULL", axis: "DELTA-before", src: "prior plugin_boosts.diff (server-derived)" },
                diff_after: { type: "INTEGER NOT NULL", axis: "DELTA-after", src: "Boosts.entries[].diff" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, skill, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },

    // ═══════════════ plugin-<mode>.db — QUESTS / DIARIES / CA / CLUES ═══════════════
    plugin_quests: {
        pk: ["account_hash", "quest_id"],
        fields: {
            ...WHO,
            quest_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "quest_name", src: "QuestEntry.id" },
            quest_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "quest_id", src: "QuestEntry.name" },
            state: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "quest progression state enum (query SELECT DISTINCT state for actuals)", src: "QuestEntry.state" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash, state)",
        ],
    },
    plugin_quests_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "quest_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "quest_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "QuestCompleted.id / QuestEntry.id",
            entity_name_src: "QuestCompleted.name / QuestEntry.name",
            delta: {
                state_before: { type: "TEXT NOT NULL", axis: "DELTA-before", note: "quest progression state enum (query SELECT DISTINCT state for actuals)", src: "prior plugin_quests.state (server-derived)" },
                state_after: { type: "TEXT NOT NULL", axis: "DELTA-after", note: "quest progression state enum (query SELECT DISTINCT state for actuals)", src: "QuestEntry.state / +COMPLETE on QuestCompleted" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, quest_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_diaries: {
        pk: ["account_hash", "diary_id"],
        fields: {
            ...WHO,
            diary_id: { type: "TEXT NOT NULL", axis: "WHAT-id", pair: "diary_name", src: "DiaryEntry.region|tier composite key" },
            diary_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "diary_id", src: "DiaryEntry display name" },
            diary_region: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "OSRS Achievement Diary geographical region enum (distinct from spatial region_id — query SELECT DISTINCT diary_region for actuals)", src: "DiaryEntry.region" },
            tier: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "difficulty tier enum (per-domain ladder; tier sets vary across diaries / CAs / clues — query SELECT DISTINCT tier for the specific table's actuals)", src: "DiaryEntry.tier" },
            complete: { type: "INTEGER NOT NULL DEFAULT 0", axis: "DELTA-state", note: "1=complete", src: "DiaryEntry.complete" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash, complete)",
            "(account_hash, diary_region)",
        ],
    },
    plugin_diaries_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "diary_id", entity_id_type: "TEXT NOT NULL",
            entity_name_col: "diary_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "DiaryCompleted.region|tier",
            entity_name_src: "DiaryCompleted display name",
            extras: {
                diary_region: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "diary geographical region (distinct from spatial region_id)", src: "DiaryCompleted.region" },
            },
            delta: {
                tier_before: { type: "TEXT NULL", axis: "DELTA-before", note: "diary tier", src: "prior plugin_diaries.tier (server-derived)" },
                tier_after: { type: "TEXT NOT NULL", axis: "DELTA-after", note: "diary tier", src: "DiaryCompleted.tier" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, diary_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_combat_achievements: {
        pk: ["account_hash", "task_id"],
        fields: {
            ...WHO,
            task_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "task_name", src: "CombatAchievementCompleted.taskId" },
            task_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "task_id", src: "plugin_combat_achievement_catalog.task_name JOIN @ write" },
            boss_id: { type: "INTEGER NULL", axis: "WHAT-id (boss)", pair: "boss_name", src: "plugin_combat_achievement_catalog.boss_id JOIN @ write" },
            boss_name: { type: "TEXT NULL", axis: "WHAT-name (boss)", pair: "boss_id", src: "plugin_combat_achievement_catalog.boss_name JOIN @ write" },
            tier: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "difficulty tier enum (per-domain ladder; tier sets vary across diaries / CAs / clues — query SELECT DISTINCT tier for the specific table's actuals)", src: "CombatAchievementCompleted.tier" },
            task_type: { type: "TEXT NULL", axis: "ENUM-id+name", note: "combat-achievement task type classifier enum (query SELECT DISTINCT task_type for actuals)", src: "CombatAchievementCompleted.taskType" },
            points: { type: "INTEGER NOT NULL", axis: "COUNTER", src: "CombatAchievementCompleted.points" },
            completed_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at first completion observation" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash, tier)",
            "(account_hash, boss_id)",
        ],
    },
    plugin_combat_achievements_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "task_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "task_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "CombatAchievementCompleted.taskId",
            entity_name_src: "plugin_combat_achievement_catalog.task_name JOIN @ write",
            extras: {
                boss_id: { type: "INTEGER NULL", axis: "WHAT-id (boss)", pair: "boss_name", src: "plugin_combat_achievement_catalog.boss_id JOIN @ write" },
                boss_name: { type: "TEXT NULL", axis: "WHAT-name (boss)", pair: "boss_id", src: "plugin_combat_achievement_catalog.boss_name JOIN @ write" },
                tier: { type: "TEXT NOT NULL", axis: "ENUM-id+name", src: "CombatAchievementCompleted.tier" },
                task_type: { type: "TEXT NULL", axis: "ENUM-id+name", src: "CombatAchievementCompleted.taskType" },
            },
            delta: {
                points_before: { type: "INTEGER NOT NULL", axis: "DELTA-before", src: "CombatAchievementCompleted.pointsBefore" },
                points_after: { type: "INTEGER NOT NULL", axis: "DELTA-after", src: "CombatAchievementCompleted.pointsBefore + .points" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, task_id, event_received_at DESC)",
            "(account_hash, tier, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_clues: {
        pk: ["account_hash", "tier"],
        fields: {
            ...WHO,
            tier: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "clue scroll difficulty tier enum (query SELECT DISTINCT tier for actuals)", src: "ClueCompleted.tier" },
            count: { type: "INTEGER NOT NULL DEFAULT 0", axis: "COUNTER", src: "ClueCompleted.total" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
        ],
    },
    plugin_clues_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "tier", entity_id_type: "TEXT NOT NULL",
            entity_name_col: null,
            entity_pair_kind: "enum",
            entity_id_src: "ClueCompleted.tier / ClueOpened.tier",
            delta: {
                count_before: { type: "INTEGER NOT NULL", axis: "DELTA-before", src: "ClueCompleted.cluesCompletedBefore / prior plugin_clues.count" },
                count_after: { type: "INTEGER NOT NULL", axis: "DELTA-after", src: "ClueCompleted.total" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, tier, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },

    // ═══════════════ plugin-<mode>.db — REWRITES (catalog renames + state restructures) ═══════════════
    plugin_combat_achievement_catalog: {
        pk: ["task_id"],
        tableNote: "populates from combat_achievements_catalog events at session start.",
        fields: {
            task_id: { type: "INTEGER PRIMARY KEY", axis: "WHAT-id", pair: "task_name", src: "game data sync (canonical task identifier from OSRS combat achievement registry)" },
            task_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "task_id", src: "game data sync" },
            description: { type: "TEXT NULL", axis: "content", src: "game data sync" },
            tier: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "difficulty tier enum (per-domain ladder; tier sets vary across diaries / CAs / clues — query SELECT DISTINCT tier for the specific table's actuals)", src: "game data sync" },
            task_type: { type: "TEXT NULL", axis: "ENUM-id+name", note: "combat-achievement task type classifier enum (query SELECT DISTINCT task_type for actuals)", src: "game data sync" },
            points: { type: "INTEGER NOT NULL", axis: "COUNTER", src: "game data sync (tier-derived point value)" },
            boss_id: { type: "INTEGER NULL", axis: "WHAT-id (boss)", pair: "boss_name", src: "game data sync (associated boss NPC for kill-count tasks)" },
            boss_name: { type: "TEXT NULL", axis: "WHAT-name (boss)", pair: "boss_id", src: "game data sync" },
            updated_at: WHEN_UPDATED,
        },
        indexes: [
            "(tier)",
            "(boss_id)",
        ],
    },
    plugin_items_catalog: {
        pk: ["item_id"],
        tableNote: "populates as a side effect of every container / loot / rune_pouch / collection_log / bank event.",
        fields: {
            item_id: { type: "INTEGER PRIMARY KEY", axis: "WHAT-id", pair: "item_name", src: "game data sync (canonical OSRS item id from ItemComposition)" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "ItemComposition lookup" },
            price_gp: { type: "INTEGER NOT NULL DEFAULT 0", axis: "DELTA-attr", src: "GE price service" },
            last_seen_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at last write" },
        },
        indexes: [
            "(item_name)",
            "(price_gp DESC)",
        ],
    },
    plugin_login_state_transitions: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            delta: {
                state_before: { type: "TEXT NOT NULL", axis: "DELTA-before", note: "RuneLite GameState enum (raw state from LoginState.state — query SELECT DISTINCT login_state for actuals; note that logout is reported as a login-screen transition, not a distinct logged-out value)", src: "prior LoginState emit (server-derived per account_hash)" },
                state_after: { type: "TEXT NOT NULL", axis: "DELTA-after", note: "RuneLite GameState enum (raw state from LoginState.state — query SELECT DISTINCT login_state for actuals; note that logout is reported as a login-screen transition, not a distinct logged-out value)", src: "LoginState.state" },
            },
            spatialOptional: true,
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_npc_kc: {
        pk: ["account_hash", "source_id"],
        tableNote: "no _changes pair — kc increments on plugin_loot_drops events; query that table for kill history.",
        fields: {
            ...WHO,
            source_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "source_name", src: "Loot.sourceId via event.getMetadata() (renamed from `source` PK)" },
            source_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "source_id", src: "Loot.source (NPC name)" },
            kc: { type: "INTEGER NOT NULL", axis: "COUNTER", note: "kill count varbit value at last loot event", src: "Loot.kc via killCounts.bumpAndLookup" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash)",
            "(source_id)",
        ],
    },
    plugin_current_state: {
        pk: ["account_hash"],
        tableNote: "singleton per account — one row aggregating everything currently true (location, activity, login_state, account_type, clan, last interaction, last damage dealt/taken, last menu action, last seen).",
        fields: {
            account_hash: { type: "TEXT PRIMARY KEY", axis: "WHO-id", pair: "latest_rsn", src: "Identity.accountHash (plugin handshake)" },
            latest_rsn: { type: "TEXT NOT NULL", axis: "WHO-name", pair: "account_hash", src: "Identity.rsn (most recent)" },
            world: { type: "INTEGER NULL", axis: "WHERE-world", src: "Identity.world" },
            activity: { type: "TEXT NULL", axis: "ENUM-id+name", note: "current activity classifier enum from Identity.activity (query SELECT DISTINCT activity for actuals)", src: "Identity.activity" },
            login_state: { type: "TEXT NULL", axis: "ENUM-id+name", note: "RuneLite GameState enum (raw state from LoginState.state — query SELECT DISTINCT login_state for actuals; note that logout is reported as a login-screen transition, not a distinct logged-out value)", src: "LoginState.state" },
            account_type: { type: "TEXT NULL", axis: "ENUM-id+name", note: "RuneLite AccountType enum (query SELECT DISTINCT account_type for actuals)", src: "Identity.accountType" },
            clan_name: { type: "TEXT NULL", axis: "STATE-only", src: "Identity.clanName" },
            clan_rank: { type: "TEXT NULL", axis: "ENUM-id+name", src: "Identity.clanRank" },
            location_x: { type: "INTEGER NULL", axis: "WHERE-spatial", src: "Location.x" },
            location_y: { type: "INTEGER NULL", axis: "WHERE-spatial", src: "Location.y" },
            location_plane: { type: "INTEGER NULL", axis: "WHERE-spatial", src: "Location.plane" },
            location_region_id: { type: "INTEGER NULL", axis: "WHERE-region", pair: "location_region_name", src: "Location.region (replaced `location_region`)" },
            location_region_name: { type: "TEXT NULL", axis: "WHERE-region", pair: "location_region_id", src: "Location.regionName" },
            energy: { type: "INTEGER NULL", axis: "DELTA-state", src: "Vitals.energy" },
            weight: { type: "INTEGER NULL", axis: "DELTA-state", src: "Vitals.weight" },
            spec: { type: "INTEGER NULL", axis: "DELTA-state", src: "Vitals.spec" },
            interacting_kind: { type: "TEXT NULL", axis: "ENUM-id+name", note: "interaction target entity-kind enum (pair disambiguator for interacting_id/name — query SELECT DISTINCT interacting_kind for actuals)", src: "Interacting.targetKind" },
            interacting_id: { type: "INTEGER NULL", axis: "WHAT-id (interacting)", pair: "interacting_name", src: "Interacting.targetId" },
            interacting_name: { type: "TEXT NULL", axis: "WHAT-name (interacting)", pair: "interacting_id", note: "NULL when interacting_kind=PLAYER per RUNELITE-PLUGIN-GUIDELINES", src: "Interacting.targetName" },
            last_damage_dealt_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at DamageDealt" },
            last_damage_dealt_amount: { type: "INTEGER NULL", axis: "DELTA-state", src: "DamageDealt.amount" },
            last_damage_dealt_hitsplat_id: { type: "INTEGER NULL", axis: "WHAT-id (hitsplat)", src: "DamageDealt.hitsplatType" },
            last_damage_dealt_target_kind: { type: "TEXT NULL", axis: "ENUM-id+name", note: "damage/cause entity-kind enum (pair disambiguator — query SELECT DISTINCT on the specific col for actuals)", src: "DamageDealt.targetKind" },
            last_damage_dealt_target_id: { type: "INTEGER NULL", axis: "WHAT-id (target)", pair: "last_damage_dealt_target_name", src: "DamageDealt.targetId" },
            last_damage_dealt_target_name: { type: "TEXT NULL", axis: "WHAT-name (target)", pair: "last_damage_dealt_target_id", note: "NULL when target_kind=PLAYER per RUNELITE-PLUGIN-GUIDELINES", src: "DamageDealt.targetName" },
            last_damage_taken_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at DamageTaken" },
            last_damage_taken_amount: { type: "INTEGER NULL", axis: "DELTA-state", src: "DamageTaken.amount" },
            last_damage_taken_hitsplat_id: { type: "INTEGER NULL", axis: "WHAT-id (hitsplat)", src: "DamageTaken.hitsplatType" },
            last_damage_taken_source_kind: { type: "TEXT NULL", axis: "ENUM-id+name", note: "damage/cause entity-kind enum (pair disambiguator — query SELECT DISTINCT on the specific col for actuals)", src: "DamageTaken.sourceKind" },
            last_damage_taken_source_id: { type: "INTEGER NULL", axis: "WHAT-id (source)", pair: "last_damage_taken_source_name", src: "DamageTaken.sourceId" },
            last_damage_taken_source_name: { type: "TEXT NULL", axis: "WHAT-name (source)", pair: "last_damage_taken_source_id", note: "NULL when source_kind=PLAYER per RUNELITE-PLUGIN-GUIDELINES", src: "DamageTaken.sourceName" },
            last_menu_action: { type: "TEXT NULL", axis: "WHAT-cause", src: "MenuAction.action" },
            last_menu_action_option: { type: "TEXT NULL", axis: "WHAT-cause", src: "MenuAction.option" },
            last_menu_action_target_kind: { type: "TEXT NULL", axis: "ENUM-id+name", note: "RuneLite MenuAction target-kind enum (query SELECT DISTINCT last_menu_action_target_kind for actuals)", src: "MenuAction.targetKind" },
            last_menu_action_target: { type: "TEXT NULL", axis: "WHAT-name (target)", src: "MenuAction.target" },
            last_menu_action_target_id: { type: "INTEGER NULL", axis: "WHAT-id (target)", src: "MenuAction.id" },
            last_menu_action_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at MenuAction" },
            last_session_id: { type: "TEXT NULL", axis: "session-group", src: "active plugin session id" },
            last_seen_in_game: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at any plugin message indicating in-game" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(latest_rsn)",
            "(location_region_id)",
            "(interacting_name)",
            "(login_state)",
            "(last_seen_in_game DESC)",
            "(updated_at DESC)",
        ],
    },

    // ═══════════════ plugin-<mode>.db — EVENT LOG ═══════════════
    plugin_loot_drops: {
        pk: ["id"],
        pkAutoIncr: true,
        tableNote: "flat shape: one row per item, no separate _items child table.",
        fields: changesTemplate({
            entity_id_col: "item_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "item_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "Loot.items[].id",
            entity_name_src: "plugin_items_catalog JOIN @ write / Loot.items[].name",
            withUnitPrice: true,
            delta: {
                qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", note: "always positive (loot received)", src: "Loot.items[].qty" },
            },
            cause: {
                cause_kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "cause/source entity-kind enum (pair disambiguator — query SELECT DISTINCT on the specific col for actuals)", src: "Loot.sourceType" },
                cause_id: { type: "INTEGER NULL", axis: "WHAT-id (cause)", pair: "cause_name", src: "Loot.sourceId via event.getMetadata() for NPC" },
                cause_name: { type: "TEXT NULL", axis: "WHAT-name (cause)", pair: "cause_id", note: "NULL when cause_kind=PLAYER per RUNELITE-PLUGIN-GUIDELINES", src: "Loot.source" },
                cause_combat_level: { type: "INTEGER NULL", axis: "DELTA-attr", note: "NULL when cause_kind∈{PLAYER,ENVIRONMENT}", src: "Loot.sourceLevel (NPCComposition.getCombatLevel for NPC)" },
                kc: { type: "INTEGER NULL", axis: "COUNTER", src: "Loot.kc via killCounts.bumpAndLookup" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, item_id, event_received_at DESC)",
            "(account_hash, cause_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_deaths: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: {
            // canonical event-row prefix
            id: ID_AUTOINCR,
            ...WHO,
            ...SESSION_ORDER,
            ...TIME_STAGES,
            ...PROVENANCE,
            // cause (deaths have no entity_id; cause fills the WHAT slot)
            cause_kind: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "damage/cause entity-kind enum (pair disambiguator — query SELECT DISTINCT on the specific col for actuals)", src: "Death.causeKind" },
            cause_id: { type: "INTEGER NULL", axis: "WHAT-id (cause)", pair: "cause_name", src: "Death.causeId" },
            cause_name: { type: "TEXT NULL", axis: "WHAT-name (cause)", pair: "cause_id", note: "NULL when cause_kind=PLAYER per RUNELITE-PLUGIN-GUIDELINES", src: "Death.causeName" },
            cause_combat_level: { type: "INTEGER NULL", axis: "DELTA-attr", note: "NULL when cause_kind∈{PLAYER,ENVIRONMENT}", src: "Death.causeCombatLevel" },
            cause_category: { type: "TEXT NULL", axis: "ENUM-id+name", note: "broader cause classification", src: "Death.causeCategory" },
            hp_before: { type: "INTEGER NULL", axis: "DELTA-before", note: "HP at last hit prior to death", src: "Death.hpBefore (InteractionState.consumeHpBefore() / client.getBoostedSkillLevel(Skill.HITPOINTS) fallback)" },
            // spatial (death location)
            ...SPATIAL_REQUIRED,
            // respawn spatial group (lobby/respawn point)
            respawn_x: { type: "INTEGER NULL", axis: "WHERE-spatial (respawn)", src: "Death.respawnX" },
            respawn_y: { type: "INTEGER NULL", axis: "WHERE-spatial (respawn)", src: "Death.respawnY" },
            respawn_plane: { type: "INTEGER NULL", axis: "WHERE-spatial (respawn)", src: "Death.respawnPlane" },
            respawn_region_id: { type: "INTEGER NULL", axis: "WHERE-region (respawn)", pair: "respawn_region_name", src: "Death.respawnRegionId" },
            respawn_region_name: { type: "TEXT NULL", axis: "WHERE-region (respawn)", pair: "respawn_region_id", src: "region-id-to-name lookup at respawn" },
            respawn_area: { type: "TEXT NULL", axis: "WHERE-area (respawn)", src: "Death.respawnArea" },
            // dedup
            ...DEDUP,
        },
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, cause_id, event_received_at DESC)",
            "(account_hash, cause_category, event_received_at DESC)",
            "(account_hash, respawn_region_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_deaths_lost_items: {
        pk: ["death_id", "item_id"],
        tableNote: "items lost on death; death_id REFERENCES plugin_deaths(id).",
        fields: {
            death_id: { type: "INTEGER NOT NULL REFERENCES plugin_deaths(id)", axis: "FK", src: "plugin_deaths.id" },
            item_id: { type: "INTEGER NOT NULL", axis: "WHAT-id", pair: "item_name", src: "inventory diff at death" },
            item_name: { type: "TEXT NOT NULL", axis: "WHAT-name", pair: "item_id", src: "plugin_items_catalog JOIN @ write" },
            qty: { type: "INTEGER NOT NULL", axis: "DELTA-state", src: "inventory diff at death" },
            unit_price_gp: { type: "INTEGER NULL", axis: "DELTA-attr", src: "plugin_items_catalog.price_gp JOIN @ write" },
        },
        indexes: [
            "(death_id)",
            "(item_id)",
        ],
    },
    plugin_pet_drops: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "pet_item_id", entity_id_type: "INTEGER NULL",
            entity_name_col: "pet_item_name", entity_name_type: "TEXT NULL",
            entity_id_src: "PetDrop.petItemId",
            entity_name_src: "PetDrop.petName",
            extras: {
                trigger: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "pet-drop trigger enum (event classifier from PetDrop.trigger — query SELECT DISTINCT trigger for actuals)", src: "PetDrop.trigger" },
                message: { type: "TEXT NOT NULL", axis: "content", src: "PetDrop.message (in-game pet drop text)" },
            },
            cause: {
                source_kind: { type: "TEXT NULL", axis: "ENUM-id+name", note: "cause/source entity-kind enum (pair disambiguator — query SELECT DISTINCT on the specific col for actuals)", src: "PetDrop.sourceKind" },
                source_id: { type: "INTEGER NULL", axis: "WHAT-id (source)", pair: "source_name", src: "PetDrop.sourceId via InteractionState" },
                source_name: { type: "TEXT NULL", axis: "WHAT-name (source)", pair: "source_id", note: "NULL when source_kind=PLAYER per RUNELITE-PLUGIN-GUIDELINES", src: "PetDrop.sourceName" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(pet_item_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_sessions: {
        pk: ["session_id"],
        fields: {
            account_hash: { type: "TEXT NOT NULL", axis: "WHO-id", pair: "rsn", src: "Identity.accountHash (plugin handshake)" },
            rsn: { type: "TEXT NOT NULL", axis: "WHO-name", pair: "account_hash", src: "Identity.rsn (plugin handshake; denormalized per-row)" },
            session_id: { type: "TEXT PRIMARY KEY", axis: "session-id", src: "UUID generated at plugin handshake" },
            world: { type: "INTEGER NULL", axis: "WHERE-world", src: "Identity.world at session start" },
            world_types: { type: "TEXT NULL", axis: "ENUM-id+name (set)", note: "comma-separated OSRS world flag set (game-mode classifiers from Identity.worldTypes — query SELECT DISTINCT world_types for actuals)", src: "Identity.worldTypes joined" },
            remote: { type: "TEXT NULL", axis: "WHO-attr", src: "websocket remote address" },
            plugin_version: { type: "TEXT NOT NULL", axis: "provenance", src: "Identity.pluginVersion (session metadata source for per-row denormalization)" },
            schema_version: { type: "INTEGER NOT NULL", axis: "provenance", src: "Identity.schemaVersion (session metadata source for per-row denormalization)" },
            connected_at: { type: "INTEGER NOT NULL", axis: "WHEN", src: "server-gen=Date.now() at ws-connect" },
            disconnected_at: { type: "INTEGER NULL", axis: "WHEN", src: "server-gen=Date.now() at ws-disconnect" },
        },
        indexes: [
            "(account_hash)",
            "(connected_at)",
            "(plugin_version, connected_at)",
        ],
    },
    plugin_world_hops: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            extras: {
                from_world: { type: "INTEGER NOT NULL", axis: "WHERE-world (from)", src: "WorldHop.fromWorld" },
                to_world: { type: "INTEGER NOT NULL", axis: "WHERE-world (to)", src: "WorldHop.toWorld" },
            },
            spatialOptional: true,
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(from_world, to_world)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_identity_drifts: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            extras: {
                old_rsn: { type: "TEXT NOT NULL", axis: "WHO-name (prior)", src: "previous Identity.rsn (server-derived per account_hash transition)" },
                new_rsn: { type: "TEXT NOT NULL", axis: "WHO-name (current)", src: "Identity.rsn" },
            },
            spatialOptional: true,
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(new_rsn, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_status_effects: {
        pk: ["account_hash", "effect"],
        fields: {
            ...WHO,
            effect: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "status effect enum from StatusEffect.effect (query SELECT DISTINCT effect for actuals)", src: "StatusEffect.effect" },
            active: { type: "INTEGER NOT NULL DEFAULT 0", axis: "DELTA-state", note: "1=active, 0=inactive", src: "StatusEffect.active" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash, active)",
        ],
    },
    plugin_status_effects_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "effect", entity_id_type: "TEXT NOT NULL",
            entity_name_col: null,
            entity_pair_kind: "enum",
            entity_id_src: "StatusEffect.effect",
            delta: {
                qty_signed: { type: "INTEGER NOT NULL", axis: "DELTA-qty", note: "+1 activate / -1 clear (mirrors plugin_prayers_changes)", src: "server-derived from StatusEffect.active transition" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, effect, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },

    // ═══════════════ plugin-<mode>.db — FARMING / SLAYER ═══════════════
    plugin_farming: {
        pk: ["account_hash", "patch_region_id", "varbit_id"],
        fields: {
            ...WHO,
            patch_region_id: { type: "INTEGER NOT NULL", axis: "WHERE-region (farm patch)", pair: "patch_region_name", src: "FarmingPatch.regionId" },
            patch_region_name: { type: "TEXT NOT NULL", axis: "WHERE-region (farm patch)", pair: "patch_region_id", src: "FarmingPatch.regionName" },
            varbit_id: { type: "INTEGER NOT NULL", axis: "WHAT-id (patch)", note: "patch identifier within region", src: "FarmingPatch.varbitId" },
            crop_id: { type: "INTEGER NULL", axis: "WHAT-id (crop)", pair: "crop_name", src: "FarmingPatch.cropId (ItemComposition lookup on seed/sapling)" },
            crop_name: { type: "TEXT NULL", axis: "WHAT-name (crop)", pair: "crop_id", src: "FarmingPatch.cropName" },
            value: { type: "INTEGER NOT NULL", axis: "DELTA-state", note: "raw varbit value", src: "FarmingPatch.value" },
            state: { type: "TEXT NOT NULL", axis: "ENUM-id+name", note: "farming patch state enum from FarmingPatch.stateName (query SELECT DISTINCT state for actuals)", src: "FarmingPatch.stateName" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(account_hash, patch_region_id)",
            "(account_hash, state)",
        ],
    },
    plugin_farming_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "patch_region_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "patch_region_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "FarmingPatch.regionId",
            entity_name_src: "FarmingPatch.regionName",
            extras: {
                varbit_id: { type: "INTEGER NOT NULL", axis: "WHAT-id (patch)", note: "patch identifier within region", src: "FarmingPatch.varbitId" },
                crop_id: { type: "INTEGER NULL", axis: "WHAT-id (crop)", pair: "crop_name", src: "FarmingPatch.cropId" },
                crop_name: { type: "TEXT NULL", axis: "WHAT-name (crop)", pair: "crop_id", src: "FarmingPatch.cropName" },
            },
            delta: {
                state_before: { type: "TEXT NOT NULL", axis: "DELTA-before", note: "prior plugin_farming.state", src: "server-derived" },
                state_after: { type: "TEXT NOT NULL", axis: "DELTA-after", src: "FarmingPatch.stateName" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, patch_region_id, varbit_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
    plugin_slayer: {
        pk: ["account_hash"],
        fields: {
            account_hash: { type: "TEXT PRIMARY KEY", axis: "WHO-id", pair: "rsn", src: "Identity.accountHash (plugin handshake; denormalized per-row)" },
            rsn: { type: "TEXT NOT NULL", axis: "WHO-name", pair: "account_hash", src: "Identity.rsn (plugin handshake; denormalized per-row)" },
            target_id: { type: "INTEGER NULL", axis: "WHAT-id (task)", pair: "target_name", src: "Slayer.target (assigned monster id)" },
            target_name: { type: "TEXT NULL", axis: "WHAT-name (npc)", pair: "target_id", src: "Slayer.targetName" },
            area_id: { type: "INTEGER NULL", axis: "WHAT-id (area)", pair: "area_name", src: "Slayer.area" },
            area_name: { type: "TEXT NULL", axis: "WHAT-name (area)", pair: "area_id", src: "Slayer.areaName" },
            master_id: { type: "INTEGER NULL", axis: "WHAT-id (master)", pair: "master_name", src: "Slayer.master" },
            master_name: { type: "TEXT NULL", axis: "WHAT-name (master)", pair: "master_id", src: "Slayer.masterName" },
            points: { type: "INTEGER NOT NULL DEFAULT 0", axis: "COUNTER", src: "Slayer.points" },
            tasks_completed: { type: "INTEGER NOT NULL DEFAULT 0", axis: "COUNTER", src: "Slayer.tasksCompleted" },
            boss_id: { type: "INTEGER NULL", axis: "WHAT-id (boss)", pair: "boss_name", src: "Slayer.bossId" },
            boss_name: { type: "TEXT NULL", axis: "WHAT-name (boss)", pair: "boss_id", src: "Slayer.bossName" },
            count: { type: "INTEGER NULL", axis: "DELTA-state", note: "remaining kc on current task", src: "Slayer.count" },
            count_original: { type: "INTEGER NULL", axis: "DELTA-attr", note: "kc at assignment", src: "Slayer.countOriginal" },
            wildy_tasks_completed: { type: "INTEGER NOT NULL DEFAULT 0", axis: "COUNTER", src: "Slayer.wildyTasksCompleted" },
            ...STATE_LIFECYCLE,
        },
        indexes: [
            "(target_id)",
        ],
    },
    plugin_slayer_changes: {
        pk: ["id"],
        pkAutoIncr: true,
        fields: changesTemplate({
            entity_id_col: "target_id", entity_id_type: "INTEGER NOT NULL",
            entity_name_col: "target_name", entity_name_type: "TEXT NOT NULL",
            entity_id_src: "Slayer.target (assigned monster id)",
            entity_name_src: "Slayer.targetName",
            delta: {
                count_remaining_before: { type: "INTEGER NOT NULL", axis: "DELTA-before", src: "prior plugin_slayer.count (server-derived)" },
                count_remaining_after: { type: "INTEGER NOT NULL", axis: "DELTA-after", src: "Slayer.count" },
            },
        }),
        indexes: [
            "(session_id, session_seq)",
            "(account_hash, event_received_at DESC)",
            "(account_hash, target_id, event_received_at DESC)",
            "UNIQUE (dedup_hash)",
        ],
    },
};
