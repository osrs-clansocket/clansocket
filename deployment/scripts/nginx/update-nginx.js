#!/usr/bin/env node

import "../../utils/load-env.js";
import { DEPLOYMENT_CONSTANTS } from "../../constants/index.js";
import { DeployLogger, SSHClient } from "../../utils/index.js";
import { TemplateRenderer } from "../../utils/env/template-renderer.js";
import { NginxBackupManager } from "./backup-manager.js";
import { NginxConfigUploader } from "./config-uploader.js";
import { NginxConfigValidator } from "./config-validator.js";
import { printUsage } from "./helpers/usage-helper.js";
import { NginxNotifier } from "./notifiers/nginx-notifier.js";

async function syncFromRemote(ssh, logger, fullBackup = false) {
    const startTime = Date.now();

    try {
        logger.log(fullBackup ? "\n📥 Downloading FULL /etc/nginx directory FROM remote...\n" : "\n📥 Syncing Nginx site config FROM remote TO local backup...\n");

        logger.log("🔗 Connecting to server...");
        await ssh.connect();
        logger.log("✅ SSH connected");

        const backupManager = new NginxBackupManager(ssh, logger);
        const backupPath = fullBackup ? await backupManager.downloadFullConfig() : await backupManager.downloadConfig();

        const endTime = Date.now();

        logger.log("\n✅ Sync complete!\n");
        logger.log(`Backup saved to: ${backupPath}`);
        if (!fullBackup) {
            logger.log(`Local config (unchanged): ${backupManager.getLocalNginxPath()}`);
        }

        await new NginxNotifier(logger).sendPullSuccessNotification(startTime, endTime, backupPath);

        ssh.dispose();
        process.exit(0);
    } catch (err) {
        logger.error("\n❌ Sync failed:", err.message || err);
        await new NginxNotifier(logger).sendPullFailureNotification(startTime, Date.now(), err);
        ssh.dispose();
        process.exit(1);
    }
}

async function syncToRemote(ssh, logger) {
    const startTime = Date.now();
    let remoteBackupPath = "";
    let localBackupPath = "";
    let backupManager = null;
    let localFiles = [];

    try {
        logger.log("\n📤 Syncing ClanSocket Nginx configs FROM local TO remote...\n");

        new TemplateRenderer(logger).renderNginxTemplates();

        logger.log("🔗 Connecting to server...");
        await ssh.connect();
        logger.log("✅ SSH connected");

        backupManager = new NginxBackupManager(ssh, logger);
        localFiles = backupManager.listLocalFiles();

        if (localFiles.length === 0) {
            throw new Error("No local nginx site files found under deployment/nginx/sites-available/");
        }

        localBackupPath = await backupManager.downloadConfig();
        remoteBackupPath = await backupManager.createRemoteBackup(localFiles);

        const uploader = new NginxConfigUploader(ssh, logger, backupManager.getLocalNginxDir());
        await uploader.upload();

        const validator = new NginxConfigValidator(ssh, logger);
        await validator.test();
        await validator.reload();
        await validator.verifyRunning();

        const endTime = Date.now();

        logger.log("\n✅ Nginx update complete!\n");
        logger.log(`Files pushed: ${localFiles.join(", ")}`);
        logger.log("Backups:");
        logger.log(`  Local backup: ${localBackupPath}`);
        logger.log(`  Remote backup: ${remoteBackupPath}`);
        logger.log(`\nSite: ${DEPLOYMENT_CONSTANTS.URLS.MAIN}`);
        logger.log("\nTest security headers:");
        logger.log(`  ${DEPLOYMENT_CONSTANTS.MONITORING.SECURITY_HEADERS}?q=${process.env.DEPLOY_PRIMARY_DOMAIN}`);

        await new NginxNotifier(logger).sendPushSuccessNotification(startTime, endTime, remoteBackupPath, backupManager.getLocalNginxPath());

        ssh.dispose();
        process.exit(0);
    } catch (err) {
        logger.error("\n❌ Nginx update failed:", err.message || err);

        if (remoteBackupPath && backupManager) {
            try {
                await backupManager.rollback(remoteBackupPath, localFiles);
            } catch (rErr) {
                logger.error("❌ Rollback also failed:", rErr.message);
            }
        }

        await new NginxNotifier(logger).sendPushFailureNotification(startTime, Date.now(), remoteBackupPath, err);
        ssh.dispose();
        process.exit(1);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const logger = new DeployLogger();
    const ssh = new SSHClient();

    if (command === "pull" || command === "download" || command === "from-remote") {
        await syncFromRemote(ssh, logger, false);
    } else if (command === "pull-full" || command === "full" || command === "pull-all") {
        await syncFromRemote(ssh, logger, true);
    } else if (command === "push" || command === "upload" || command === "to-remote" || !command) {
        await syncToRemote(ssh, logger);
    } else {
        printUsage(logger);
        process.exit(1);
    }
}

main().catch((err) => {
    new DeployLogger().error("Fatal Error:", err);
    process.exit(1);
});
