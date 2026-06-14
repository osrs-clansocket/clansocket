import { DEPLOYMENT_CONSTANTS, DISCORD_CONFIG, TIMING_CONSTANTS } from "../../constants/index.js";
import {
    buildWebhookUsername,
    DISCORD_COLORS,
    formatBytes,
    formatDuration,
    GitInfo,
    NotificationBuilder,
    SystemInfo,
} from "../index.js";

export class DiscordSyncNotifier {
    constructor(logger) {
        this.logger = logger;
    }

    async sendSuccessNotification(jobName, startTime, endTime, backupFilename, syncStats) {
        if (!DISCORD_CONFIG.OPS_WEBHOOK_URL) {
            return;
        }
        try {
            const finishedTimestamp = Math.floor(endTime / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS);
            const duration = formatDuration(endTime - startTime);
            this.logger.log("🔔 Sending Discord ops notification...");
            await new NotificationBuilder(DISCORD_CONFIG.OPS_WEBHOOK_URL)
                .setUsername(buildWebhookUsername(`Sync: ${jobName}`))
                .addEmbed({
                    title: `🔄 ClanSocket Sync Successful — ${jobName}`,
                    color: DISCORD_COLORS.SYNC,
                    thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                    fields: [
                        { name: "Backup File 📁", value: backupFilename ? `\`${backupFilename}\`` : "N/A", inline: true },
                        { name: "Duration ⏱️", value: `\`${duration}s\``, inline: true },
                        { name: "Finished ✅", value: `<t:${finishedTimestamp}:R>`, inline: true },
                        { name: "Targets 🎯", value: this.formatSyncStats(syncStats), inline: false },
                        { name: "Key Steps 👟", value: `\`\`\`${this.logger.getTruncatedSteps()}\`\`\``, inline: false },
                        { name: "Git Information 📋", value: GitInfo.formatForDiscord(), inline: false },
                        { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                    ],
                })
                .send();
            this.logger.log("✅ Discord ops notification sent");
        } catch (err) {
            this.logger.warn(`Failed to send Discord ops notification: ${err.message}`);
        }
    }

    async sendFailureNotification(jobName, startTime, endTime, backupFilename, syncStats, error) {
        if (!DISCORD_CONFIG.OPS_WEBHOOK_URL) {
            return;
        }
        try {
            const finishedTimestamp = Math.floor(endTime / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS);
            const duration = formatDuration(endTime - startTime);
            await new NotificationBuilder(DISCORD_CONFIG.OPS_WEBHOOK_URL)
                .setUsername(buildWebhookUsername(`Sync Failed: ${jobName}`))
                .addEmbed({
                    title: `💥 ClanSocket Sync Failed — ${jobName}`,
                    color: DISCORD_COLORS.ERROR,
                    thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                    fields: [
                        { name: "Error ❌", value: `\`\`\`${error.message || error}\`\`\``, inline: false },
                        { name: "Backup File 📁", value: backupFilename ? `\`${backupFilename}\`` : "N/A", inline: true },
                        { name: "Duration ⏱️", value: `\`${duration}s\``, inline: true },
                        { name: "Finished 💥", value: `<t:${finishedTimestamp}:R>`, inline: true },
                        { name: "Targets 🎯", value: this.formatSyncStats(syncStats), inline: false },
                        { name: "Key Steps 👟", value: `\`\`\`${this.logger.getTruncatedSteps()}\`\`\``, inline: false },
                        { name: "Git Information 📋", value: GitInfo.formatForDiscord(), inline: false },
                        { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                    ],
                })
                .send();
        } catch (err) {
            this.logger.warn(`Failed to send Discord ops notification: ${err.message}`);
        }
    }

    formatSyncStats(syncStats) {
        if (!Array.isArray(syncStats) || syncStats.length === 0) {
            return "No targets synced.";
        }
        return syncStats
            .map((s) => `• \`${s.dest}\` — ${s.uploadedCount} file(s), ${formatBytes(s.totalBytes)}`)
            .join("\n");
    }
}
