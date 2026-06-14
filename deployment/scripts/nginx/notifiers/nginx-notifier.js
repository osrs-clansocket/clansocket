import fs from "node:fs";
import path from "node:path";
import { DEPLOYMENT_CONSTANTS, DISCORD_CONFIG, NGINX_CONSTANTS, TIMING_CONSTANTS } from "../../../constants/index.js";
import { buildWebhookUsername, DISCORD_COLORS, formatDuration, NotificationBuilder, SystemInfo } from "../../../utils/index.js";

export class NginxNotifier {
    constructor(logger) {
        this.logger = logger;
    }

    async sendNotification(embedConfig, username, fileContent = null, fileName = null) {
        if (!DISCORD_CONFIG.NGINX_WEBHOOK_URL) {
            return;
        }

        try {
            this.logger.log("🔔 Sending Discord notification...");
            const builder = new NotificationBuilder(DISCORD_CONFIG.NGINX_WEBHOOK_URL)
                .setUsername(username)
                .addEmbed(embedConfig);

            if (DISCORD_CONFIG.UPDATES_ROLE) {
                builder.setContent(DISCORD_CONFIG.UPDATES_ROLE);
            }

            if (fileContent && fileName) {
                builder.addFile(fileContent, fileName, "text/plain");
            }

            await builder.send();
            this.logger.log("✅ Discord notification sent");
        } catch (discordErr) {
            this.logger.warn(`Failed to send Discord notification: ${discordErr.message}`);
        }
    }

    buildTimingFields(startTime, endTime, operation, status) {
        const duration = formatDuration(endTime - startTime);
        const finishedTimestamp = Math.floor(endTime / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS);
        return [
            { name: "Operation 🔄", value: `\`${operation}\``, inline: true },
            { name: "Duration ⏱️", value: `\`${duration}s\``, inline: true },
            { name: `${status} ${status === "Finished" ? "✅" : "💥"}`, value: `<t:${finishedTimestamp}:R>`, inline: true },
        ];
    }

    async sendPullSuccessNotification(startTime, endTime, localFilePath) {
        await this.sendNotification(
            {
                title: "📥 ClanSocket Nginx Config Pull Successful",
                color: DISCORD_COLORS.INFO,
                thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                fields: [
                    ...this.buildTimingFields(startTime, endTime, "pull", "Finished"),
                    { name: "Local File 📄", value: `\`${path.basename(localFilePath)}\``, inline: true },
                    { name: "Source 🌐", value: `\`${DEPLOYMENT_CONSTANTS.URLS.MAIN}\``, inline: true },
                    { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                ],
            },
            buildWebhookUsername("Nginx Pull Successful"),
        );
    }

    async sendPullFailureNotification(startTime, endTime, error) {
        await this.sendNotification(
            {
                title: "❌ ClanSocket Nginx Config Pull Failed",
                color: DISCORD_COLORS.ERROR,
                thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                fields: [
                    { name: "Error ❌", value: `\`\`\`${error.message}\`\`\``, inline: false },
                    ...this.buildTimingFields(startTime, endTime, "pull", "Failed At"),
                    { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                ],
            },
            buildWebhookUsername("Nginx Pull Failed"),
        );
    }

    async sendPushSuccessNotification(startTime, endTime, backupPath, nginxConfigPath) {
        const nginxContent = fs.readFileSync(nginxConfigPath, "utf-8");
        const preview =
            nginxContent.length > NGINX_CONSTANTS.PREVIEW_LENGTH
                ? `${nginxContent.substring(0, NGINX_CONSTANTS.PREVIEW_LENGTH)}...`
                : nginxContent;

        await this.sendNotification(
            {
                title: "✅ ClanSocket Nginx Config Sync Successful",
                color: DISCORD_COLORS.NGINX,
                thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                fields: [
                    ...this.buildTimingFields(startTime, endTime, "push", "Finished"),
                    { name: "Backup 📁", value: backupPath ? `\`${path.basename(backupPath)}\`` : "N/A", inline: true },
                    { name: "Validation ✅", value: "`nginx -t passed`", inline: true },
                    { name: "Nginx Reload ✅", value: "`systemctl reload nginx`", inline: true },
                    { name: "Site 🌐", value: `[Visit Site](${DEPLOYMENT_CONSTANTS.URLS.MAIN})`, inline: true },
                    {
                        name: "Security Headers Test 🔐",
                        value: `[Test Security](${DEPLOYMENT_CONSTANTS.MONITORING.SECURITY_HEADERS}?q=${process.env.DEPLOY_PRIMARY_DOMAIN})`,
                        inline: false,
                    },
                    { name: "Config Preview 📄", value: `\`\`\`nginx\n${preview}\n\`\`\``, inline: false },
                    { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                ],
            },
            buildWebhookUsername("Nginx Push Successful"),
            nginxContent,
            `${DEPLOYMENT_CONSTANTS.PROJECT_SLUG}-nginx.conf`,
        );
    }

    async sendPushFailureNotification(startTime, endTime, backupPath, error) {
        await this.sendNotification(
            {
                title: "❌ ClanSocket Nginx Config Sync Failed",
                color: DISCORD_COLORS.ERROR,
                thumbnail: DEPLOYMENT_CONSTANTS.URLS.THUMBNAIL,
                fields: [
                    { name: "Error ❌", value: `\`\`\`${error.message}\`\`\``, inline: false },
                    ...this.buildTimingFields(startTime, endTime, "push", "Failed At"),
                    { name: "Backup 📁", value: backupPath ? `\`${path.basename(backupPath)}\`` : "N/A", inline: true },
                    { name: "Rollback Status", value: backupPath ? "Attempted" : "N/A", inline: true },
                    { name: "System Information 💻", value: SystemInfo.formatForDiscord(), inline: false },
                ],
            },
            buildWebhookUsername("Nginx Push Failed"),
        );
    }
}
