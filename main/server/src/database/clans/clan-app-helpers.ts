import { randomUUID } from "node:crypto";
import { getDb, DB_NAMES, clanDirRelPath } from "../core/database.js";
import { getOne, execMutation } from "../core/db-helpers.js";
import { lookupVerifiedRsnForHash } from "../plugin/plugin-rsn-lookup.js";

const UNCLAIMED_PREFIX = "__unclaimed-";
const SLUG_MAX_BASE_LEN = 32;
const SLUG_RANDOM_SUFFIX_LEN = 6;

export type ClanStatus = "unclaimed" | "pending" | "active" | "recovery" | "archived";

export type ClanIconKind = "builtin" | "image" | "voxlab";

export interface ClanRow {
    id: string;
    slug: string;
    display_name: string;
    status: ClanStatus;
    owner_account_hash: string | null;
    owner_site_account_id: string | null;
    dir_path: string;
    created_at: number;
    claimed_at: number | null;
    archived_at: number | null;
    icon_kind: ClanIconKind | null;
    icon_value: string | null;
    color: string | null;
}

export function slugify(name: string): string {
    const base = name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, SLUG_MAX_BASE_LEN);
    return base.length > 0 ? base : "clan";
}

function unclaimedSlug(displayName: string): string {
    const base = slugify(displayName);
    const suffix = randomUUID().replace(/-/g, "").slice(0, SLUG_RANDOM_SUFFIX_LEN);
    return `${UNCLAIMED_PREFIX}${base}-${suffix}`;
}

export interface ProvisionClanArgs {
    displayName: string;
    slug?: string;
    status?: ClanStatus;
    ownerAccountHash?: string | null;
    ownerSiteAccountId?: string | null;
    id?: string;
}

export function provisionClan(args: ProvisionClanArgs): ClanRow {
    const id = args.id ?? randomUUID();
    const status = args.status ?? "unclaimed";
    const slug = args.slug ?? unclaimedSlug(args.displayName);
    const now = Date.now();
    const claimedAt = status === "active" ? now : null;
    const dirPath = clanDirRelPath(id);
    const ownerHash = args.ownerAccountHash ?? null;
    const ownerRsn = ownerHash ? lookupVerifiedRsnForHash(ownerHash) : null;
    execMutation(
        getDb(DB_NAMES.APP),
        `INSERT INTO clansocket_clans (id, slug, display_name, status, owner_account_hash, owner_rsn, owner_site_account_id, dir_path, created_at, claimed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        slug,
        args.displayName,
        status,
        ownerHash,
        ownerRsn,
        args.ownerSiteAccountId ?? null,
        dirPath,
        now,
        claimedAt,
    );
    return {
        id,
        slug,
        display_name: args.displayName,
        status,
        owner_account_hash: args.ownerAccountHash ?? null,
        owner_site_account_id: args.ownerSiteAccountId ?? null,
        dir_path: dirPath,
        created_at: now,
        claimed_at: claimedAt,
        archived_at: null,
        icon_kind: null,
        icon_value: null,
        color: null,
    };
}

const CLAN_COLUMNS =
    "id, slug, display_name, status, owner_account_hash, owner_site_account_id, dir_path, created_at, claimed_at, archived_at, icon_kind, icon_value, color";

export function findClanByDisplayName(displayName: string): ClanRow | null {
    return getOne<ClanRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${CLAN_COLUMNS}
         FROM clansocket_clans WHERE LOWER(display_name) = LOWER(?) AND archived_at IS NULL
         ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 WHEN 'recovery' THEN 2 ELSE 3 END,
                  created_at DESC LIMIT 1`,
        displayName,
    );
}

export function getClanById(id: string): ClanRow | null {
    return getOne<ClanRow>(getDb(DB_NAMES.APP), `SELECT ${CLAN_COLUMNS} FROM clansocket_clans WHERE id = ?`, id);
}

export function getClanBySlug(slug: string): ClanRow | null {
    return getOne<ClanRow>(getDb(DB_NAMES.APP), `SELECT ${CLAN_COLUMNS} FROM clansocket_clans WHERE slug = ?`, slug);
}

export function resolveOrCreateClan(displayName: string): ClanRow {
    const existing = findClanByDisplayName(displayName);
    if (existing) return existing;
    return provisionClan({ displayName, status: "unclaimed" });
}

export function countClans(): number {
    const db = getDb(DB_NAMES.APP);
    return (db.prepare("SELECT COUNT(*) AS c FROM clansocket_clans").get() as { c: number }).c;
}
