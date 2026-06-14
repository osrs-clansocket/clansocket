import { getClanPluginDb } from "../../../core/database.js";

export interface PluginCombatAchievementCatalogEntry {
    taskId: number;
    name: string;
    description: string;
    tier: string;
    taskType: string;
    points: number;
    bossId: number;
    bossName: string;
}

export function upsertPluginCombatAchievementCatalog(
    clanId: string,
    mode: string,
    entries: PluginCombatAchievementCatalogEntry[],
): number {
    const conn = getClanPluginDb(clanId, mode);
    const stmt = conn.prepare(
        `INSERT OR REPLACE INTO plugin_combat_achievement_catalog
            (task_id, task_name, description, tier, task_type, points, boss_id, boss_name, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = Date.now();
    let count = 0;
    conn.transaction(() => {
        for (const e of entries) {
            stmt.run(e.taskId, e.name, e.description, e.tier, e.taskType, e.points, e.bossId, e.bossName, now);
            count++;
        }
    })();
    return count;
}
