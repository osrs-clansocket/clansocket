import { mapWomAccountType, type ClanSocketAccountType } from "./wom-account-type-mapper.js";

interface WomSkillMetric {
    rank?: number;
    level?: number;
    experience?: number;
}

interface WomBossMetric {
    rank?: number;
    kills?: number;
}

interface WomActivityMetric {
    rank?: number;
    score?: number;
}

interface WomSnapshotData {
    skills?: Record<string, WomSkillMetric>;
    bosses?: Record<string, WomBossMetric>;
    activities?: Record<string, WomActivityMetric>;
}

interface WomLatestSnapshot {
    createdAt?: string;
    importedAt?: string | null;
    data?: WomSnapshotData;
}

interface WomPlayerDetailsRaw {
    id?: number;
    username?: string;
    displayName?: string;
    type?: string;
    updatedAt?: string;
    lastChangedAt?: string | null;
    latestSnapshot?: WomLatestSnapshot | null;
}

export interface MappedSnapshotSkill {
    skill: string;
    level: number;
    experience: number;
}

export interface MappedSnapshotBoss {
    slug: string;
    sourceName: string;
    kc: number;
}

export interface MappedSnapshotActivity {
    activityName: string;
    score: number;
}

export interface MappedPlayerSnapshot {
    rsn: string;
    womPlayerId: number | null;
    accountType: ClanSocketAccountType;
    updatedAtMs: number;
    skills: MappedSnapshotSkill[];
    bosses: MappedSnapshotBoss[];
    activities: MappedSnapshotActivity[];
}

function titleCaseFromSlug(slug: string): string {
    const parts = slug.split("_");
    const out: string[] = [];
    for (const part of parts) {
        if (part.length === 0) continue;
        out.push(part.charAt(0).toUpperCase() + part.slice(1));
    }
    return out.join(" ");
}

function parseIsoToMs(iso: string | null | undefined): number {
    if (typeof iso !== "string" || iso.length === 0) return 0;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? 0 : ms;
}

function mapSkills(skills: Record<string, WomSkillMetric> | undefined): MappedSnapshotSkill[] {
    if (!skills) return [];
    const out: MappedSnapshotSkill[] = [];
    for (const [skill, metric] of Object.entries(skills)) {
        if (typeof metric.level !== "number" || typeof metric.experience !== "number") continue;
        out.push({ skill, level: metric.level, experience: metric.experience });
    }
    return out;
}

function mapBosses(bosses: Record<string, WomBossMetric> | undefined): MappedSnapshotBoss[] {
    if (!bosses) return [];
    const out: MappedSnapshotBoss[] = [];
    for (const [slug, metric] of Object.entries(bosses)) {
        if (typeof metric.kills !== "number") continue;
        if (metric.kills <= 0) continue;
        out.push({ slug, sourceName: titleCaseFromSlug(slug), kc: metric.kills });
    }
    return out;
}

function mapActivities(activities: Record<string, WomActivityMetric> | undefined): MappedSnapshotActivity[] {
    if (!activities) return [];
    const out: MappedSnapshotActivity[] = [];
    for (const [activityName, metric] of Object.entries(activities)) {
        if (typeof metric.score !== "number") continue;
        if (metric.score < 0) continue;
        out.push({ activityName, score: metric.score });
    }
    return out;
}

export function mapPlayerDetailsToSnapshot(payload: unknown): MappedPlayerSnapshot | null {
    if (payload === null || typeof payload !== "object") return null;
    const raw = payload as WomPlayerDetailsRaw;
    const rsn = raw.displayName ?? raw.username;
    if (typeof rsn !== "string" || rsn.length === 0) return null;
    const snapshotData = raw.latestSnapshot?.data;
    const watermarkMs = parseIsoToMs(raw.lastChangedAt) || parseIsoToMs(raw.updatedAt);
    return {
        rsn,
        womPlayerId: typeof raw.id === "number" ? raw.id : null,
        accountType: mapWomAccountType(raw.type),
        updatedAtMs: watermarkMs,
        skills: mapSkills(snapshotData?.skills),
        bosses: mapBosses(snapshotData?.bosses),
        activities: mapActivities(snapshotData?.activities),
    };
}
