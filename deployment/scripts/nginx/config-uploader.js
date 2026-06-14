import fs from "node:fs";
import path from "node:path";
import { NGINX_CONSTANTS } from "../../constants/index.js";

export class NginxConfigUploader {
    constructor(sshClient, logger, localNginxDir) {
        this.ssh = sshClient;
        this.logger = logger;
        this.localNginxDir = localNginxDir;
    }

    async upload() {
        this.logger.log("📤 Uploading Nginx site configs to remote...");

        if (!fs.existsSync(this.localNginxDir)) {
            throw new Error(`Local Nginx directory not found: ${this.localNginxDir}`);
        }

        const sitesAvailableDir = path.join(this.localNginxDir, "sites-available");
        if (!fs.existsSync(sitesAvailableDir)) {
            throw new Error(`Local sites-available directory not found: ${sitesAvailableDir}`);
        }

        for (const file of fs.readdirSync(sitesAvailableDir)) {
            if (file.endsWith(".template")) continue;
            if (file === ".gitkeep") continue;
            const localPath = path.join(sitesAvailableDir, file);
            if (!fs.statSync(localPath).isFile()) {
                continue;
            }

            await this.ssh.putFile(localPath, `/tmp/${file}`);
            await this.ssh.execCommand(`sudo mv /tmp/${file} /etc/nginx/sites-available/${file}`);
            await this.ssh.execCommand(`sudo chown root:root /etc/nginx/sites-available/${file}`);
            await this.ssh.execCommand(`sudo chmod ${NGINX_CONSTANTS.FILE_PERMISSIONS.CONFIG_FILE} /etc/nginx/sites-available/${file}`);
            await this.ssh.execCommand(
                `sudo ln -sf /etc/nginx/sites-available/${file} /etc/nginx/sites-enabled/${file}`
            );
            this.logger.log(`✅ ${file} uploaded + enabled`);
        }
    }
}
