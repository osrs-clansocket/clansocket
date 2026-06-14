import { ERROR_CLAN_NOT_FOUND } from "../../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { getClanBySlug, getClanDb, getRosterPluginPresence, listClanTitleLadder } from "../../../database/index.js";
import { canonicalRsn } from "../../../database/site/rsn/canonicalize.js";
import { projectPublicClan, type PublicClanMember, type PublicClanRoster } from "../../projectors/public-projector.js";

const router: Router = Router();

interface RawRosterMember {
    name: string;
    rank: string | null;
    joinedAt: string | null;
    accountHash?: string | null;
}

interface RosterRow {
    fingerprint: string;
    captured_at: number;
    member_count: number;
    members_json: string;
}

router.get("/:slug", (req: Request, res: Response) => {
    const slug = String(req.params.slug ?? "").toLowerCase();
    if (!slug) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_slug" });
        return;
    }
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    let roster: PublicClanRoster | null = null;
    try {
        const clanDb = getClanDb(clan.id);
        const row = clanDb
            .prepare(
                `SELECT fingerprint, captured_at, member_count, members_json
                 FROM clan_rosters ORDER BY captured_at DESC LIMIT 1`,
            )
            .get() as RosterRow | undefined;
        if (row) {
            const rawMembers = JSON.parse(row.members_json) as RawRosterMember[];
            const presence = getRosterPluginPresence(clan.id, rawMembers);
            const members: PublicClanMember[] = rawMembers.map((m) => {
                const p = presence.get(m.name.toLowerCase());
                return {
                    name: canonicalRsn(m.name),
                    rank: m.rank,
                    joinedAt: m.joinedAt,
                    hasPlugin: p?.hasPlugin === true,
                    isLive: p?.isLive === true,
                };
            });
            roster = {
                capturedAt: row.captured_at,
                memberCount: row.member_count,
                members,
            };
        }
    } catch (err) {
        logger.error(`[clansocket_clans] roster lookup failed for ${clan.id}: ${(err as Error).message}`);
    }
    res.json(projectPublicClan(clan, roster));
});

router.get("/:slug/clan-titles", (req: Request, res: Response) => {
    const clan = getClanBySlug(String(req.params.slug ?? "").toLowerCase());
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    res.json({ entries: listClanTitleLadder(clan.id) });
});

export default router;
