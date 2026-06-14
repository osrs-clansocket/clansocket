import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPLOYMENT_CONSTANTS } from "../../../constants/index.js";
import { loadFilter } from "../../../utils/filter-loader.js";
import { timeStamp } from "../../../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_TARGET = "backup";

export class BackupManager {
    constructor(sshClient, logger) {
        this.ssh = sshClient;
        this.logger = logger;
        this.backupDir = path.join(__dirname, "..", "..", "..", "backups");

        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async createRemoteBackup() {
        this.logger.log("🗄️ Creating remote backup...");
        const backupFilename = `${DEPLOYMENT_CONSTANTS.PROJECT_SLUG}-backup_${timeStamp()}.tar.gz`;
        const remoteTmp = `/tmp/${backupFilename}`;

        const { disallow: skip } = loadFilter(BACKUP_TARGET);
        const excludeFlags = skip.map((p) => `--exclude='./${p.replace(/'/g, "'\\''")}'`).join(" ");
        const tarCmd = `tar -czf ${remoteTmp} -C ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} ${excludeFlags} . 2>/dev/null || true`;
        const { code, stderr } = await this.ssh.execCommand(tarCmd);

        if (code !== 0 && stderr) {
            this.logger.warn(`Backup warning: ${stderr}`);
        }

        this.logger.logWithDuration(`✅ Remote backup created (excluding ${skip.length} path(s))`);
        return { backupFilename, remoteTmp };
    }

    async downloadBackup(backupFilename, remoteTmp) {
        this.logger.log("⬇️ Downloading backup...");
        const localBackupPath = path.join(this.backupDir, backupFilename);
        await this.ssh.getFile(localBackupPath, remoteTmp);
        this.logger.logWithDuration(`✅ Backup saved locally: ${localBackupPath}`);

        await this.ssh.execCommand(`rm -f ${remoteTmp}`);
        this.logger.log("🗑️ Cleaned up remote backup file.");

        return localBackupPath;
    }

    async createAndDownload() {
        const { backupFilename, remoteTmp } = await this.createRemoteBackup();
        await this.downloadBackup(backupFilename, remoteTmp);
        return backupFilename;
    }

    pruneOldBackups() {
        this.logger.log(`🧹 Pruning old backups (keeping last ${DEPLOYMENT_CONSTANTS.BACKUP_RETENTION_COUNT})...`);
        const backupPrefix = `${DEPLOYMENT_CONSTANTS.PROJECT_SLUG}-backup_`;
        const backups = fs
            .readdirSync(this.backupDir)
            .filter((f) => f.startsWith(backupPrefix) && f.endsWith(".tar.gz"))
            .sort((a, b) => fs.statSync(path.join(this.backupDir, b)).mtimeMs - fs.statSync(path.join(this.backupDir, a)).mtimeMs);

        if (backups.length > DEPLOYMENT_CONSTANTS.BACKUP_RETENTION_COUNT) {
            const toDelete = backups.slice(DEPLOYMENT_CONSTANTS.BACKUP_RETENTION_COUNT);
            toDelete.forEach((file) => {
                fs.unlinkSync(path.join(this.backupDir, file));
                this.logger.log(`🗑️ Removed old backup: ${file}`);
            });
        }

        this.logger.logWithDuration("✅ Prune step done");
    }

    async rollback(backupFilename) {
        this.logger.log("🚨 Rolling back...");
        const localBackupPath = path.join(this.backupDir, backupFilename);
        const remoteTmp = `/tmp/${backupFilename}`;

        this.logger.log(`⬆️ Re-uploading old backup: ${backupFilename}`);
        await this.ssh.putFile(localBackupPath, remoteTmp);

        this.logger.log("Extracting backup on remote...");
        await this.ssh.execCommand(`cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && tar -xzf ${remoteTmp} && rm -f ${remoteTmp}`);

        await this.ssh.execCommand(`cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && pm2 restart all`);

        this.logger.log("✅ Rollback complete.");
    }
}
