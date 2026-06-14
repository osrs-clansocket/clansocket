import { DEPLOYMENT_CONSTANTS, DISCORD_CONFIG, TIMING_CONSTANTS } from "../../../../constants/index.js";
import { buildWebhookUsername, DISCORD_COLORS, formatBytes, formatDuration, GitInfo, NotificationBuilder, SystemInfo } from "../../../../utils/index.js";

export class DiscordNotifier {
    constructor(logger) {
        this.logger = logger;
    }

    async sendSuccessNotification(startTime, endTime, backupFilename, deployStats) {
        if (!DISCORD_CONFIG.WEBHOOK_URL) {
            return;
        }

        try {
            const finishedTimestamp = Math.floor(endTime / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS);
            const duration = formatDuration(endTime - startTime);

            this.logger.log("🔔 Sending Discord notification...");
            await new NotificationBuilder(DISCORD_CONFIG.WEBHOOK_URL)
                .setUsername(buildWebhookUsername("Deployment Successful"))
                .addEmbed({
                    title: "🚀 ClanSocket Deployment Successful",
                    color: DISCORD_COLORS.SUCCESS,
                    thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                    fields: [
                        { name: "Backup File 📁", value: backupFilename ? `\`${backupFilename}\`` : "N/A", inline: true },
                        { name: "Duration ⏱️", value: `\`${duration}s\``, inline: true },
                        { name: "Finished ✅", value: `<t:${finishedTimestamp}:R>`, inline: true },
                        {
                            name: "Site 🌐",
                            value: `[${DEPLOYMENT_CONSTANTS.URLS.MAIN}](${DEPLOYMENT_CONSTANTS.URLS.MAIN})`,
                            inline: false,
                        },
                        { name: "Deployment Summary 📦", value: this.formatDeployStats(deployStats), inline: false },
                        { name: "Key Steps 👟", value: `\`\`\`${this.logger.getTruncatedSteps()}\`\`\``, inline: false },
                        { name: "Git Information 📋", value: GitInfo.formatForDiscord(), inline: false },
                        { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                        { name: "Testing & Security 🔐", value: this.formatMonitoringLinks(), inline: false },
                    ],
                })
                .send();
            this.logger.log("✅ Discord notification sent");
        } catch (discordErr) {
            this.logger.warn(`Failed to send Discord notification: ${discordErr.message}`);
        }
    }

    async sendFailureNotification(startTime, endTime, backupFilename, deployStats, error) {
        if (!DISCORD_CONFIG.WEBHOOK_URL) {
            return;
        }

        try {
            const finishedTimestamp = Math.floor(endTime / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS);
            const duration = formatDuration(endTime - startTime);

            const builder = new NotificationBuilder(DISCORD_CONFIG.WEBHOOK_URL)
                .setUsername(buildWebhookUsername("Deployment Failed"));
            if (DISCORD_CONFIG.UPDATES_ROLE) {
                builder.setContent(DISCORD_CONFIG.UPDATES_ROLE);
            }

            await builder
                .addEmbed({
                    title: "💥 ClanSocket Deployment Failed",
                    color: DISCORD_COLORS.ERROR,
                    thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                    fields: [
                        { name: "Error ❌", value: `\`\`\`${error.message || error}\`\`\``, inline: false },
                        { name: "Backup File 📁", value: backupFilename ? `\`${backupFilename}\`` : "N/A", inline: true },
                        { name: "Duration ⏱️", value: `\`${duration}s\``, inline: true },
                        { name: "Finished 💥", value: `<t:${finishedTimestamp}:R>`, inline: true },
                        { name: "Deployment Summary 📦", value: this.formatDeployStats(deployStats), inline: false },
                        { name: "Key Steps 👟", value: `\`\`\`${this.logger.getTruncatedSteps()}\`\`\``, inline: false },
                        { name: "Git Information 📋", value: GitInfo.formatForDiscord(), inline: false },
                        { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                    ],
                })
                .send();
        } catch (discordErr) {
            this.logger.warn(`Failed to send Discord notification: ${discordErr.message}`);
        }
    }

    formatDeployStats(deployStats) {
        if (!deployStats) {
            return "No deployment stats available";
        }
        return `• **Files:** \`${deployStats.uploadedCount}/${deployStats.totalFileCount} uploaded (${deployStats.failedCount} failed)\`\n• **Total Size:** \`${formatBytes(deployStats.totalBytes)}\``;
    }

    formatMonitoringLinks() {
        return Object.entries(DEPLOYMENT_CONSTANTS.MONITORING)
            .map(([key, url]) => `[${key}](${url})`)
            .join("\n");
    }
}
