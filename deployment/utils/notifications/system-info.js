import { execSync } from "node:child_process";
import os from "node:os";

const BYTES_PER_GB = 1024 * 1024 * 1024;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

export class SystemInfo {
    static getNodeVersion() {
        return process.version;
    }

    static getNpmVersion() {
        try {
            return execSync("npm --version", { encoding: "utf-8" }).trim();
        } catch {
            return "Unknown";
        }
    }

    static getOS() {
        return `${os.type()} ${os.release()}`;
    }

    static getCPUs() {
        const cpus = os.cpus();
        return cpus.length > 0 ? `${cpus[0].model} (${cpus.length} cores)` : "Unknown";
    }

    static getTotalMemory() {
        return `${(os.totalmem() / BYTES_PER_GB).toFixed(2)} GB`;
    }

    static getUptime() {
        const uptimeSeconds = os.uptime();
        const days = Math.floor(uptimeSeconds / SECONDS_PER_DAY);
        const hours = Math.floor((uptimeSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
        return `${days}d ${hours}h`;
    }

    static formatForDiscord() {
        return [
            `• **OS:** \`${this.getOS()}\``,
            `• **Node:** \`${this.getNodeVersion()}\` | **NPM:** \`${this.getNpmVersion()}\``,
            `• **CPU:** \`${this.getCPUs()}\``,
            `• **Memory:** \`${this.getTotalMemory()}\` | **Uptime:** \`${this.getUptime()}\``,
        ].join("\n");
    }
}
