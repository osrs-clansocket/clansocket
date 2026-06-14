import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPLOYMENT_CONSTANTS, NGINX_CONSTANTS } from "../../constants/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NginxBackupManager {
    constructor(sshClient, logger) {
        this.ssh = sshClient;
        this.logger = logger;
        this.localNginxDir = path.join(__dirname, "..", "..", "nginx");
        this.backupDir = path.join(__dirname, "..", "..", "backups", "nginx");
        this.lastBackupPath = null;
    }

    getLocalNginxDir() {
        return this.localNginxDir;
    }

    getLocalNginxPath() {
        return path.join(this.localNginxDir, "sites-available", NGINX_CONSTANTS.SITE_NAME);
    }

    listLocalFiles() {
        const sitesAvailableDir = path.join(this.localNginxDir, "sites-available");
        if (!fs.existsSync(sitesAvailableDir)) {
            return [];
        }
        return fs.readdirSync(sitesAvailableDir).filter((f) => {
            if (f.endsWith(".template")) return false;
            if (f === ".gitkeep") return false;
            return fs.statSync(path.join(sitesAvailableDir, f)).isFile();
        });
    }

    async createRemoteBackup(localFiles = null) {
        this.logger.log("📦 Creating backup of current remote Nginx configs...");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const backupDir = `${NGINX_CONSTANTS.BACKUP_TEMP_PREFIX}${timestamp}`;
        const files = localFiles ?? this.listLocalFiles();

        await this.ssh.execCommand(`mkdir -p ${backupDir}`);

        let trackedCount = 0;
        for (const file of files) {
            const remotePath = `${NGINX_CONSTANTS.REMOTE_SITES_AVAILABLE_DIR}/${file}`;
            const backupPath = `${backupDir}/${file}`;
            const { stdout } = await this.ssh.execCommand(
                `test -f ${remotePath} && cp ${remotePath} ${backupPath} && echo "backed-up" || echo "new-file"`
            );
            if (stdout.trim() === "backed-up") {
                trackedCount += 1;
            }
        }

        this.logger.log(
            `✅ Backup dir created: ${backupDir} (${trackedCount}/${files.length} pre-existing file${files.length === 1 ? "" : "s"} backed up; the rest are new-file pushes and will be deleted on rollback)`
        );
        return backupDir;
    }

    async downloadConfig() {
        this.logger.log("⬇️ Downloading current remote config to local backup directory...");

        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            this.logger.log(`📁 Created backup directory: ${this.backupDir}`);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const backupFilename = `${DEPLOYMENT_CONSTANTS.PROJECT_SLUG}-${timestamp}.conf`;
        const backupPath = path.join(this.backupDir, backupFilename);

        try {
            await this.ssh.getFile(backupPath, NGINX_CONSTANTS.REMOTE_CONFIG_PATH);
            this.logger.log(`✅ Remote config saved to: ${backupPath}`);
        } catch (err) {
            this.logger.warn(`⚠️ Could not download remote config (may not exist yet): ${err.message}`);
        }

        this.lastBackupPath = backupPath;
        this.logger.log(`📝 Local config unchanged at: ${this.getLocalNginxPath()}`);

        return backupPath;
    }

    async downloadFullConfig() {
        this.logger.log("⬇️ Downloading ENTIRE /etc/nginx directory to local backup...");

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const fullBackupDir = path.join(this.backupDir, `full-${timestamp}`);

        if (!fs.existsSync(fullBackupDir)) {
            fs.mkdirSync(fullBackupDir, { recursive: true });
        }

        await this.ssh.execCommand("tar -czf /tmp/nginx-full-backup.tar.gz -C /etc nginx");
        const tarPath = path.join(fullBackupDir, "nginx-full.tar.gz");
        await this.ssh.getFile(tarPath, "/tmp/nginx-full-backup.tar.gz");
        await this.ssh.execCommand("rm /tmp/nginx-full-backup.tar.gz");

        this.lastBackupPath = fullBackupDir;
        this.logger.log(`✅ Downloaded to: ${tarPath}`);
        this.logger.log("\n💡 To extract:");
        this.logger.log(`   cd ${fullBackupDir}`);
        this.logger.log(`   tar -xzf nginx-full.tar.gz`);

        return fullBackupDir;
    }

    async rollback(backupDir, localFiles = null) {
        this.logger.log("🚨 Rolling back Nginx configs...");
        const files = localFiles ?? this.listLocalFiles();

        for (const file of files) {
            const remotePath = `${NGINX_CONSTANTS.REMOTE_SITES_AVAILABLE_DIR}/${file}`;
            const enabledPath = `${NGINX_CONSTANTS.REMOTE_SITES_ENABLED_DIR}/${file}`;
            const backupPath = `${backupDir}/${file}`;

            await this.ssh.execCommand(
                `if [ -f ${backupPath} ]; then cp ${backupPath} ${remotePath}; else rm -f ${remotePath} ${enabledPath}; fi`
            );
        }

        await this.ssh.execCommand(NGINX_CONSTANTS.COMMANDS.RELOAD);
        this.logger.log(`✅ Rollback complete (${files.length} file${files.length === 1 ? "" : "s"})`);
    }
}
