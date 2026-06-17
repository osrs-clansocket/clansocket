import logger from "@clansocket/logger";
import { listClanPluginModes } from "../../database/core/database.js";
import { resolveAccountHashByRsn } from "../../database/wom/saturate/resolve-account-hash.js";
import { saturateAccountsFromWom, type WomAccountRow } from "../../database/wom/saturate/saturate-accounts.js";
import { saturateBossesFromWom, type WomBossRow } from "../../database/wom/saturate/saturate-bosses.js";
import { saturateCluesFromWom, type WomClueRow } from "../../database/wom/saturate/saturate-clues.js";
import { saturateStatsFromWom, type WomStatRow } from "../../database/wom/saturate/saturate-stats.js";
import { mapWomAccountType } from "../mappers/wom-account-type-mapper.js";
import { mapPlayerDetailsToSnapshot, type MappedPlayerSnapshot } from "../mappers/wom-snapshot-mapper.js";

const CLUE_PREFIX = "clue_scrolls_";

interface DetailsMembershipPlayer {
    id?: number;
    username?: string;
    displayName?: string;
    type?: string;
    lastChangedAt?: string | null;
    updatedAt?: string | null;
}

interface DetailsMembership {
    role?: string | null;
    player?: DetailsMembershipPlayer;
}

interface DetailsLike {
    id?: number;
    memberships?: DetailsMembership[];
}

interface HiscoresPlayer {
    username?: string;
    displayName?: string;
    lastChangedAt?: string | null;
    updatedAt?: string | null;
}

interface HiscoresData {
    type?: string;
    rank?: number;
    level?: number;
    experience?: number;
    kills?: number;
    score?: number;
    value?: number;
}

interface HiscoresEntry {
    player?: HiscoresPlayer;
    data?: HiscoresData;
}

function extractClueTier(metric: string): string | null {
    if (!metric.startsWith(CLUE_PREFIX)) return null;
    return metric.substring(CLUE_PREFIX.length);
}

function parseIsoToMs(iso: string | null | undefined): number {
    if (typeof iso !== "string" || iso.length === 0) return 0;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? 0 : ms;
}

function playerChangedAtMs(player: { lastChangedAt?: string | null; updatedAt?: string | null }): number {
    return parseIsoToMs(player.lastChangedAt) || parseIsoToMs(player.updatedAt);
}

export function saturateFromGroupDetails(clanId: string, womGroupId: number, response: unknown): number {
    const details = response as DetailsLike;
    if (!Array.isArray(details.memberships)) return 0;
    const modes = listClanPluginModes(clanId);
    if (modes.length === 0) return 0;
    const accountRows: WomAccountRow[] = [];
    for (const m of details.memberships) {
        const player = m.player;
        if (!player || typeof player.displayName !== "string") continue;
        const accountHash = resolveAccountHashByRsn(clanId, womGroupId, player.displayName);
        accountRows.push({
            accountHash,
            rsn: player.displayName,
            accountType: mapWomAccountType(player.type),
            lastChangedAtMs: playerChangedAtMs(player),
        });
    }
    let written = 0;
    for (const mode of modes) {
        written += saturateAccountsFromWom(clanId, mode, accountRows);
    }
    logger.info(
        `[wom-saturate] clan=${clanId} group=${womGroupId} accounts=${accountRows.length} written=${written} modes=${modes.length}`,
    );
    return written;
}

export function saturateFromMetricHiscores(
    clanId: string,
    womGroupId: number,
    metric: string,
    response: unknown,
): number {
    if (!Array.isArray(response)) return 0;
    const entries = response as HiscoresEntry[];
    const modes = listClanPluginModes(clanId);
    if (modes.length === 0) return 0;
    const clueTier = extractClueTier(metric);
    const statRows: WomStatRow[] = [];
    const clueRows: WomClueRow[] = [];
    for (const entry of entries) {
        const player = entry.player;
        if (!player || typeof player.displayName !== "string") continue;
        const data = entry.data;
        if (!data) continue;
        const accountHash = resolveAccountHashByRsn(clanId, womGroupId, player.displayName);
        const changedAtMs = playerChangedAtMs(player);
        if (data.type === "skill" && typeof data.level === "number" && typeof data.experience === "number") {
            statRows.push({
                accountHash,
                rsn: player.displayName,
                skill: metric,
                level: data.level,
                experience: data.experience,
                lastChangedAtMs: changedAtMs,
            });
        } else if (data.type === "activity" && typeof data.score === "number" && clueTier !== null) {
            clueRows.push({
                accountHash,
                rsn: player.displayName,
                tier: clueTier,
                count: data.score,
                lastChangedAtMs: changedAtMs,
            });
        }
    }
    let written = 0;
    for (const mode of modes) {
        written += saturateStatsFromWom(clanId, mode, statRows);
        written += saturateCluesFromWom(clanId, mode, clueRows);
    }
    logger.info(
        `[wom-saturate] clan=${clanId} metric=${metric} stats=${statRows.length} clues=${clueRows.length} written=${written}`,
    );
    return written;
}

export interface PlayerSnapshotSaturationResult {
    accountHash: string;
    rsn: string;
    womPlayerId: number | null;
    updatedAtMs: number;
    statsWritten: number;
    bossesWritten: number;
    cluesWritten: number;
    accountsWritten: number;
}

function buildStatRows(accountHash: string, snapshot: MappedPlayerSnapshot, changedAtMs: number): WomStatRow[] {
    const out: WomStatRow[] = [];
    for (const row of snapshot.skills) {
        out.push({
            accountHash,
            rsn: snapshot.rsn,
            skill: row.skill,
            level: row.level,
            experience: row.experience,
            lastChangedAtMs: changedAtMs,
        });
    }
    return out;
}

function buildBossRows(accountHash: string, snapshot: MappedPlayerSnapshot, changedAtMs: number): WomBossRow[] {
    const out: WomBossRow[] = [];
    for (const row of snapshot.bosses) {
        out.push({
            accountHash,
            rsn: snapshot.rsn,
            slug: row.slug,
            sourceName: row.sourceName,
            kc: row.kc,
            lastChangedAtMs: changedAtMs,
        });
    }
    return out;
}

function buildClueRows(accountHash: string, snapshot: MappedPlayerSnapshot, changedAtMs: number): WomClueRow[] {
    const out: WomClueRow[] = [];
    for (const row of snapshot.activities) {
        const tier = extractClueTier(row.activityName);
        if (tier === null) continue;
        out.push({
            accountHash,
            rsn: snapshot.rsn,
            tier,
            count: row.score,
            lastChangedAtMs: changedAtMs,
        });
    }
    return out;
}

export function saturateFromPlayerSnapshot(
    clanId: string,
    womGroupId: number,
    response: unknown,
): PlayerSnapshotSaturationResult | null {
    const snapshot = mapPlayerDetailsToSnapshot(response);
    if (!snapshot) return null;
    const modes = listClanPluginModes(clanId);
    if (modes.length === 0) return null;
    const accountHash = resolveAccountHashByRsn(clanId, womGroupId, snapshot.rsn);
    const changedAtMs = snapshot.updatedAtMs;
    const statRows = buildStatRows(accountHash, snapshot, changedAtMs);
    const bossRows = buildBossRows(accountHash, snapshot, changedAtMs);
    const clueRows = buildClueRows(accountHash, snapshot, changedAtMs);
    const accountRows: WomAccountRow[] = [
        {
            accountHash,
            rsn: snapshot.rsn,
            accountType: snapshot.accountType,
            lastChangedAtMs: changedAtMs,
        },
    ];
    let statsWritten = 0;
    let bossesWritten = 0;
    let cluesWritten = 0;
    let accountsWritten = 0;
    for (const mode of modes) {
        statsWritten += saturateStatsFromWom(clanId, mode, statRows);
        bossesWritten += saturateBossesFromWom(clanId, mode, bossRows);
        cluesWritten += saturateCluesFromWom(clanId, mode, clueRows);
        accountsWritten += saturateAccountsFromWom(clanId, mode, accountRows);
    }
    logger.info(
        `[wom-saturate] player clan=${clanId} rsn=${snapshot.rsn} stats=${statRows.length} bosses=${bossRows.length} clues=${clueRows.length} written=${statsWritten + bossesWritten + cluesWritten + accountsWritten}`,
    );
    return {
        accountHash,
        rsn: snapshot.rsn,
        womPlayerId: snapshot.womPlayerId,
        updatedAtMs: changedAtMs,
        statsWritten,
        bossesWritten,
        cluesWritten,
        accountsWritten,
    };
}
