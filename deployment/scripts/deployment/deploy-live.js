#!/usr/bin/env node

import "../../utils/load-env.js";
import { DEPLOYMENT_CONSTANTS, DISCORD_CONFIG } from "../../constants/index.js";
import { DeployLogger, formatBytes, formatDuration, SSHClient } from "../../utils/index.js";
import { TemplateRenderer } from "../../utils/env/template-renderer.js";
import { BackupManager } from "./modules/backup-manager.js";
import { FileUploader } from "./modules/file-uploader.js";
import { DiscordNotifier } from "./modules/notifiers/discord-notifier.js";
import { ProcessManager } from "./modules/process-manager.js";
import { ValidationBuilder } from "./modules/validation-builder.js";

if (!DISCORD_CONFIG.WEBHOOK_URL) {
    new DeployLogger().warn("⚠️ DEPLOY_DISCORD_WEBHOOK_URL not set — Discord notifications disabled");
}

async function main() {
    const startTime = Date.now();
    const logger = new DeployLogger();
    const ssh = new SSHClient();
    const args = process.argv.slice(2);
    const skipVerify = args.includes("--skip-verify") || args.includes("--fast");
    let backupFilename = "";
    let deployStats = null;

    try {
        logger.log(`\n🚀 ClanSocket Deployment Starting...\n`);

        new ValidationBuilder(logger).validateAndBuild({ skipVerify });

        new TemplateRenderer(logger).renderAll();

        logger.log("🔗 Connecting to server...");
        await ssh.connect();
        logger.logWithDuration("✅ SSH connected");

        const backupManager = new BackupManager(ssh, logger);
        backupFilename = await backupManager.createAndDownload();
        backupManager.pruneOldBackups();

        const fileUploader = new FileUploader(ssh, logger);
        deployStats = await fileUploader.upload();

        const processManager = new ProcessManager(ssh, logger);
        await processManager.setupEnvironment();
        await processManager.installDependencies();
        await processManager.restartApplication();

        const endTime = Date.now();
        const duration = formatDuration(endTime - startTime);

        await new DiscordNotifier(logger).sendSuccessNotification(startTime, endTime, backupFilename, deployStats);

        logger.log("\n✅ Deployment Summary:");
        logger.log(`   Files: ${deployStats.uploadedCount}/${deployStats.totalFileCount} uploaded`);
        logger.log(`   Size: ${formatBytes(deployStats.totalBytes)}`);
        logger.log(`   Duration: ${duration}s`);
        logger.log(`   Backup: ${backupFilename}`);
        logger.log("\n🎉 Deployment succeeded!\n");
        logger.log(`   Site: ${DEPLOYMENT_CONSTANTS.URLS.MAIN}`);

        ssh.dispose();
        process.exit(0);
    } catch (err) {
        logger.error("\n❌ Deployment failed:", err.message || err);

        if (backupFilename) {
            try {
                await new BackupManager(ssh, logger).rollback(backupFilename);
            } catch (rErr) {
                logger.error("Rollback also failed:", rErr);
            }
        }

        const endTime = Date.now();
        await new DiscordNotifier(logger).sendFailureNotification(startTime, endTime, backupFilename, deployStats, err);

        ssh.dispose();
        process.exit(1);
    }
}

main().catch((err) => {
    new DeployLogger().error("Fatal Error in main()", err);
    process.exit(1);
});
