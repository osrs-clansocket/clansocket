import { DEPLOYMENT_CONSTANTS, NPM_CONFIG } from "../../../constants/index.js";

export class ProcessManager {
    constructor(sshClient, logger) {
        this.ssh = sshClient;
        this.logger = logger;
    }

    async setupEnvironment() {
        this.logger.log("⚙️ Checking ecosystem configuration...");
        const { stdout } = await this.ssh.execCommand(
            `test -f ${DEPLOYMENT_CONSTANTS.REMOTE_PATH}/ecosystem.config.cjs && echo "exists" || echo "missing"`
        );

        if (stdout.trim() === "missing") {
            throw new Error("Ecosystem config not found on server");
        }
        this.logger.log("✅ ecosystem.config.cjs exists");

        await this.ssh.execCommand(
            `chmod 600 ${DEPLOYMENT_CONSTANTS.REMOTE_PATH}/ecosystem.config.cjs`
        );
        this.logger.log("🔒 ecosystem.config.cjs permissions locked to 600 (owner read/write only)");
    }

    async installDependencies() {
        this.logger.log("📦 Installing dependencies on remote...");
        const { stderr, code } = await this.ssh.execCommand(
            `source ~/.nvm/nvm.sh && cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && npm install ${NPM_CONFIG.INSTALL_FLAGS}`
        );
        if (code !== 0) {
            throw new Error(`NPM install failed: ${stderr}`);
        }
        this.logger.logWithDuration("✅ Dependencies installed");
    }

    async ensureLogRotate() {
        const { stdout } = await this.ssh.execCommand("source ~/.nvm/nvm.sh && pm2 list | grep -c pm2-logrotate || true");
        if (stdout.trim() !== "0") {
            this.logger.log("✅ pm2-logrotate already installed");
            return;
        }
        this.logger.log("📦 Installing pm2-logrotate...");
        await this.ssh.execCommand("source ~/.nvm/nvm.sh && pm2 install pm2-logrotate");
        await this.ssh.execCommand("source ~/.nvm/nvm.sh && pm2 set pm2-logrotate:max_size 50M");
        await this.ssh.execCommand("source ~/.nvm/nvm.sh && pm2 set pm2-logrotate:retain 14");
        await this.ssh.execCommand("source ~/.nvm/nvm.sh && pm2 set pm2-logrotate:compress true");
        await this.ssh.execCommand("source ~/.nvm/nvm.sh && pm2 set pm2-logrotate:rotateInterval '0 0 * * *'");
        this.logger.logWithDuration("✅ pm2-logrotate configured (50M max, 14 retained, compressed, nightly)");
    }

    async restartApplication() {
        this.logger.log("🔄 Restarting application with PM2...");

        const { code: pm2Check } = await this.ssh.execCommand("source ~/.nvm/nvm.sh && which pm2");
        if (pm2Check !== 0) {
            this.logger.log("📦 Installing PM2...");
            await this.ssh.execCommand("source ~/.nvm/nvm.sh && npm install -g pm2");
        }

        await this.ensureLogRotate();

        await this.ssh.execCommand(
            `source ~/.nvm/nvm.sh && cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && pm2 delete ${DEPLOYMENT_CONSTANTS.PM2.DISCORD_NAME} ${DEPLOYMENT_CONSTANTS.PM2.SERVER_NAME} 2>/dev/null || true`
        );
        await this.ssh.execCommand(`source ~/.nvm/nvm.sh && cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && pm2 start ecosystem.config.cjs`);
        await this.ssh.execCommand(`source ~/.nvm/nvm.sh && cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && pm2 save`);

        this.logger.logWithDuration("✅ Application restarted");
    }
}
