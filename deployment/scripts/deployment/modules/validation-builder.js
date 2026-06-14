import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ValidationBuilder {
    constructor(logger) {
        this.logger = logger;
        this.projectRoot = path.join(__dirname, "..", "..", "..", "..");
    }

    runCommand(cmd) {
        this.logger.log(`> ${cmd}`);
        try {
            execSync(cmd, { stdio: "inherit", cwd: this.projectRoot });
        } catch (err) {
            throw new Error(`Command failed: ${cmd}\n${err}`);
        }
    }

    validateAndBuild({ skipVerify = false } = {}) {
        if (skipVerify) {
            this.logger.log("⚡ --skip-verify: skipping lint/format, running build only...");
            this.runCommand("npm run build");
            this.logger.logWithDuration("✅ Build complete");
            return;
        }
        this.logger.log("🔍 Running verify (lint:fix → format → build)...");
        this.runCommand("npm run verify");
        this.logger.logWithDuration("✅ Verify + build complete");
    }
}
