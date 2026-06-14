import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.resolve("logs/asset-optimize.log");

class AuditLogger {
    constructor() {
        this.ensureLogDir();
    }

    ensureLogDir() {
        const logDir = path.dirname(LOG_FILE);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    write(message) {
        try {
            fs.appendFileSync(LOG_FILE, message + "\n");
        } catch (error) {
            console.warn("[audit-logger] write failed:", error.message);
        }
    }

    logOperation(direction, remotePath, fileCount, status) {
        const arrow = direction === "send" ? "→" : "←";
        this.write(`[${this.getTimestamp()}] ${direction.toUpperCase()} ${arrow} ${remotePath} (${fileCount} files) [${status}]`);
    }

    logError(direction, remotePath, error) {
        this.write(`[${this.getTimestamp()}] ${direction.toUpperCase()} ERROR ${remotePath}: ${error.message}`);
    }

    logSummary(direction, operations, totalFiles) {
        this.write(`[${this.getTimestamp()}] ${direction.toUpperCase()} COMPLETE: ${operations} operations, ${totalFiles} files total`);
        this.write("");
    }
}

export const auditLogger = new AuditLogger();
