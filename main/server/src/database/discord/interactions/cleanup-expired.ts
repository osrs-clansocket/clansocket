import { runDiscordBotWrite } from "../db-runners.js";

export function cleanupExpiredInteractions(): number {
    const result = runDiscordBotWrite(
        `DELETE FROM discord_interactions_pending WHERE expires_at < ? AND acknowledged_at IS NULL`,
        Date.now(),
    );
    return result.changes;
}
