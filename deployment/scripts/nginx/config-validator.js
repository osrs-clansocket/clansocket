import { NGINX_CONSTANTS } from "../../constants/index.js";

export class NginxConfigValidator {
    constructor(sshClient, logger) {
        this.ssh = sshClient;
        this.logger = logger;
    }

    async test() {
        this.logger.log("🧪 Testing Nginx configuration...");
        const { code, stderr } = await this.ssh.execCommand(NGINX_CONSTANTS.COMMANDS.TEST);

        if (code !== 0) {
            this.logger.error("❌ Nginx configuration test failed:");
            this.logger.error(stderr);
            throw new Error("Nginx test failed - see errors above");
        }

        this.logger.log("✅ Nginx configuration test passed");
    }

    async reload() {
        this.logger.log("🔄 Reloading Nginx...");
        const { code, stderr } = await this.ssh.execCommand(NGINX_CONSTANTS.COMMANDS.RELOAD);

        if (code !== 0) {
            throw new Error(`Failed to reload Nginx: ${stderr}`);
        }

        this.logger.log("✅ Nginx reloaded successfully");
    }

    async verifyRunning() {
        this.logger.log("🔍 Verifying Nginx is running...");
        const { stdout } = await this.ssh.execCommand(NGINX_CONSTANTS.COMMANDS.STATUS);

        if (stdout.trim() !== NGINX_CONSTANTS.EXPECTED_STATUS) {
            throw new Error("Nginx is not running after reload");
        }

        this.logger.log("✅ Nginx is running");
    }
}
