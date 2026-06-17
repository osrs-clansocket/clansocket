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

interface WomPlayerData {
    skills?: Record<string, WomSkillMetric>;
    bosses?: Record<string, WomBossMetric>;
    activities?: Record<string, WomActivityMetric>;
}

interface WomGroupMembership {
    player?: { id?: number; username?: string; displayName?: string; type?: string };
    data?: WomPlayerData;
}

export type WomGroupHiscoresResponse = readonly WomGroupMembership[];

export interface MappedSkillRow {
    skill: string;
    level: number;
    experience: number;
}

export interface MappedBossRow {
    sourceName: string;
    kc: number;
}

export interface MappedActivityRow {
    activityName: string;
    score: number;
}

export interface MappedClanMember {
    rsn: string;
    womPlayerId: number | null;
    accountType: ClanSocketAccountType;
    skills: MappedSkillRow[];
    bosses: MappedBossRow[];
    activities: MappedActivityRow[];
}

function mapSkillsMap(skills: Record<string, WomSkillMetric> | undefined): MappedSkillRow[] {
    if (!skills) return [];
    const out: MappedSkillRow[] = [];
    for (const [skillName, metric] of Object.entries(skills)) {
        if (typeof metric.level !== "number" || typeof metric.experience !== "number") continue;
        out.push({ skill: skillName, level: metric.level, experience: metric.experience });
    }
    return out;
}

function mapBossesMap(bosses: Record<string, WomBossMetric> | undefined): MappedBossRow[] {
    if (!bosses) return [];
    const out: MappedBossRow[] = [];
    for (const [bossName, metric] of Object.entries(bosses)) {
        if (typeof metric.kills !== "number") continue;
        out.push({ sourceName: bossName, kc: metric.kills });
    }
    return out;
}

function mapActivitiesMap(activities: Record<string, WomActivityMetric> | undefined): MappedActivityRow[] {
    if (!activities) return [];
    const out: MappedActivityRow[] = [];
    for (const [activityName, metric] of Object.entries(activities)) {
        if (typeof metric.score !== "number") continue;
        out.push({ activityName, score: metric.score });
    }
    return out;
}

export function mapGroupHiscoresResponse(response: WomGroupHiscoresResponse): MappedClanMember[] {
    const out: MappedClanMember[] = [];
    for (const entry of response) {
        const player = entry.player;
        if (!player || typeof player.username !== "string") continue;
        out.push({
            rsn: player.displayName ?? player.username,
            womPlayerId: typeof player.id === "number" ? player.id : null,
            accountType: mapWomAccountType(player.type),
            skills: mapSkillsMap(entry.data?.skills),
            bosses: mapBossesMap(entry.data?.bosses),
            activities: mapActivitiesMap(entry.data?.activities),
        });
    }
    return out;
}
