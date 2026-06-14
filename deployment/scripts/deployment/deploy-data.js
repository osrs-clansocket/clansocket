#!/usr/bin/env node

import "../../utils/load-env.js";
import { DeployLogger, formatBytes, formatDuration, SSHClient } from "../../utils/index.js";
import { BackupManager } from "./modules/backup-manager.js";
import { FileUploader } from "./modules/file-uploader.js";
import { DiscordSyncNotifier } from "../../utils/notifications/discord-sync-notifier.js";

const TARGET = "deploy-data";

async function main() {
    const startTime = Date.now();
    const logger = new DeployLogger();
    const ssh = new SSHClient();
    let backupFilename = "";
    let stats = null;

    try {
        logger.log(`\n📦 ClanSocket Data Push [${TARGET}]\n`);

        logger.log("🔗 Connecting to server...");
        await ssh.connect();
        logger.logWithDuration("✅ SSH connected");

        const backupManager = new BackupManager(ssh, logger);
        backupFilename = await backupManager.createAndDownload();
        backupManager.pruneOldBackups();

        const uploader = new FileUploader(ssh, logger, {
            target: TARGET,
            skipClean: true,
            skipEcosystem: true,
        });
        stats = await uploader.upload();

        const endTime = Date.now();
        const duration = formatDuration(endTime - startTime);

        await new DiscordSyncNotifier(logger).sendSuccessNotification(
            TARGET,
            startTime,
            endTime,
            backupFilename,
            [{ dest: "main/server/data/", uploadedCount: stats.uploadedCount, totalBytes: stats.totalBytes }],
        );

        logger.log("\n✅ Data push summary:");
        logger.log(`   Files: ${stats.uploadedCount}/${stats.totalFileCount} uploaded`);
        logger.log(`   Size: ${formatBytes(stats.totalBytes)}`);
        logger.log(`   Duration: ${duration}s`);
        logger.log(`   Backup: ${backupFilename}`);
        logger.log(`\n🎉 Data push succeeded!\n`);

        ssh.dispose();
        process.exit(0);
    } catch (err) {
        logger.error(`\n❌ Data push failed:`, err.message || err);
        if (backupFilename) {
            try {
                await new BackupManager(ssh, logger).rollback(backupFilename);
            } catch (rErr) {
                logger.error("Rollback also failed:", rErr);
            }
        }
        const endTime = Date.now();
        await new DiscordSyncNotifier(logger).sendFailureNotification(
            TARGET,
            startTime,
            endTime,
            backupFilename,
            stats ? [{ dest: "main/server/data/", uploadedCount: stats.uploadedCount, totalBytes: stats.totalBytes }] : [],
            err,
        );
        ssh.dispose();
        process.exit(1);
    }
}

main().catch((err) => {
    new DeployLogger().error("Fatal error in deploy-data:", err);
    process.exit(1);
});
