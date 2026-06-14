#!/usr/bin/env node

import "../../utils/load-env.js";
import { DEPLOYMENT_CONSTANTS } from "../../constants/index.js";
import { DeployLogger, formatDuration, SSHClient } from "../../utils/index.js";
import { loadFilter } from "../../utils/filter-loader.js";
import { safeRemotePath } from "../../utils/path-safety.js";
import { BackupManager } from "./modules/backup-manager.js";
import { DiscordSyncNotifier } from "../../utils/notifications/discord-sync-notifier.js";

const TARGET = "deploy-clear-data";

function printDryRun(logger, paths) {
    logger.log(`\n⚠️ Destructive op — would DELETE these remote paths under ${DEPLOYMENT_CONSTANTS.REMOTE_PATH}:`);
    for (const p of paths) logger.log(`   - ${p}`);
    logger.log(`\nRe-run with --confirm to execute. No local upload follows.\n`);
}

async function main() {
    const startTime = Date.now();
    const logger = new DeployLogger();
    const args = process.argv.slice(2);
    const proceed = args.includes("--confirm");

    const { allow: paths } = loadFilter(TARGET);
    if (paths.length === 0) {
        logger.warn(`\nNo paths listed in deploy-clear-data-inclusions.json — nothing to do.\n`);
        process.exit(0);
    }

    if (!proceed) {
        printDryRun(logger, paths);
        process.exit(0);
    }

    const ssh = new SSHClient();
    let backupFilename = "";

    try {
        logger.log(`\n🗑️ ClanSocket Data Clear [${TARGET}]\n`);

        logger.log("🔗 Connecting to server...");
        await ssh.connect();
        logger.logWithDuration("✅ SSH connected");

        const backupManager = new BackupManager(ssh, logger);
        backupFilename = await backupManager.createAndDownload();
        backupManager.pruneOldBackups();

        logger.log(`🗑️ Clearing ${paths.length} remote path(s)...`);
        for (const p of paths) {
            const remoteAbs = safeRemotePath(p);
            await ssh.execCommand(`rm -rf ${remoteAbs}`);
            logger.log(`   - cleared ${p}`);
        }
        logger.logWithDuration("✅ Remote paths cleared");

        const endTime = Date.now();
        const duration = formatDuration(endTime - startTime);

        await new DiscordSyncNotifier(logger).sendSuccessNotification(
            TARGET,
            startTime,
            endTime,
            backupFilename,
            [{ dest: paths.join(", "), uploadedCount: 0, totalBytes: 0 }],
        );

        logger.log("\n✅ Data clear summary:");
        logger.log(`   Cleared: ${paths.length} path(s)`);
        logger.log(`   Duration: ${duration}s`);
        logger.log(`   Backup: ${backupFilename}`);
        logger.log(`\n🎉 Data clear succeeded!\n`);

        ssh.dispose();
        process.exit(0);
    } catch (err) {
        logger.error(`\n❌ Data clear failed:`, err.message || err);
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
            [{ dest: paths.join(", "), uploadedCount: 0, totalBytes: 0 }],
            err,
        );
        ssh.dispose();
        process.exit(1);
    }
}

main().catch((err) => {
    new DeployLogger().error("Fatal error in deploy-clear-data:", err);
    process.exit(1);
});
