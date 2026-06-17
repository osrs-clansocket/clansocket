import { Router, type Request, type Response } from "express";
import { HTTP_BAD_REQUEST } from "../../shared/http/http-status.js";
import {
    deleteGlobalPreset,
    deleteOverride,
    getClanDb,
    getGlobalPreset,
    getOverride,
    getRosterPluginPresence,
    listOverrides,
    setGlobalPreset,
    setOverride,
} from "../../database/index.js";
import { canonicalRsn } from "../../database/site/rsn/canonicalize.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { broadcastClanConfigForClan, broadcastClanConfigForMember } from "../../plugin-api/handlers/clan-config.js";
import { resolveManager } from "./manager-context.js";

interface RawRosterMember {
    name: string;
    rank: string | null;
    joinedAt: string | null;
    accountHash?: string | null;
}

interface RosterMemberResponse {
    accountHash: string;
    rsn: string;
    rank: string | null;
}

function loadPluginRosterMembers(clanId: string): RosterMemberResponse[] {
    const row = getClanDb(clanId)
        .prepare(`SELECT members_json FROM clan_rosters ORDER BY captured_at DESC LIMIT 1`)
        .get() as { members_json: string } | undefined;
    if (!row) return [];
    const raw = JSON.parse(row.members_json) as RawRosterMember[];
    const presence = getRosterPluginPresence(clanId, raw);
    const out: RosterMemberResponse[] = [];
    for (const m of raw) {
        const hash = typeof m.accountHash === "string" && m.accountHash.length > 0 ? m.accountHash : null;
        if (hash === null) continue;
        const p = presence.get(m.name.toLowerCase());
        if (p?.hasPlugin !== true) continue;
        out.push({ accountHash: hash, rsn: canonicalRsn(m.name), rank: m.rank });
    }
    return out;
}

const router: Router = Router();

const SCHEMA_VERSION = 1;
const DENY_PREFIXES = ["$", "snap_hash.", "wikiav."];
const DENY_KEYS = new Set(["mode", "serverWsUrl"]);

function isDenylisted(key: string): boolean {
    for (const p of DENY_PREFIXES) {
        if (key.startsWith(p)) return true;
    }
    return DENY_KEYS.has(key);
}

function sanitizeValues(input: unknown): Record<string, string | number | boolean> | null {
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    const src = input as Record<string, unknown>;
    const out: Record<string, string | number | boolean> = {};
    for (const key of Object.keys(src)) {
        if (isDenylisted(key)) continue;
        const v = src[key];
        if (typeof v === "string" || typeof v === "boolean") {
            out[key] = v;
        } else if (typeof v === "number" && Number.isFinite(v)) {
            out[key] = v;
        } else {
            return null;
        }
    }
    return out;
}

function parseBodyValues(body: unknown): Record<string, string | number | boolean> | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    if (b.version !== undefined && b.version !== SCHEMA_VERSION) return null;
    return sanitizeValues(b.values);
}

router.get("/:slug/manage/plugin-config", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const global = getGlobalPreset(ctx.clanId);
    const overrides = listOverrides(ctx.clanId);
    const members = loadPluginRosterMembers(ctx.clanId);
    res.json({
        global: global
            ? {
                  preset: global.preset,
                  updatedAt: global.updatedAt,
                  updatedBySiteAccountId: global.updatedBySiteAccountId,
              }
            : null,
        overrides: overrides.map((o) => ({
            accountHash: o.accountHash,
            preset: o.preset,
            updatedAt: o.updatedAt,
            updatedBySiteAccountId: o.updatedBySiteAccountId,
        })),
        members,
    });
});

router.put("/:slug/manage/plugin-config/global", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const values = parseBodyValues(req.body);
    if (values === null) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_preset" });
        return;
    }
    setGlobalPreset(ctx.clanId, values, ctx.siteAccountId, Date.now());
    broadcastClanConfigForClan(ctx.clanId);
    res.json({ ok: true });
});

router.delete("/:slug/manage/plugin-config/global", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    deleteGlobalPreset(ctx.clanId);
    res.json({ ok: true });
});

router.put("/:slug/manage/plugin-config/members/:accountHash", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const accountHash = String(req.params.accountHash ?? "");
    if (accountHash.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_account_hash" });
        return;
    }
    const values = parseBodyValues(req.body);
    if (values === null) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_preset" });
        return;
    }
    setOverride(ctx.clanId, accountHash, values, ctx.siteAccountId, Date.now());
    broadcastClanConfigForMember(ctx.clanId, accountHash);
    res.json({ ok: true });
});

router.delete("/:slug/manage/plugin-config/members/:accountHash", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const accountHash = String(req.params.accountHash ?? "");
    if (accountHash.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_account_hash" });
        return;
    }
    const existed = getOverride(ctx.clanId, accountHash) !== null;
    deleteOverride(ctx.clanId, accountHash);
    if (existed) {
        broadcastClanConfigForMember(ctx.clanId, accountHash);
    }
    res.json({ ok: true });
});

export default router;
