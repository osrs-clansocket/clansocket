import fs from "node:fs";
import path from "node:path";

const REQUIRED_PRODUCTION_VARS = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];

const PLACEHOLDER_PATTERNS = [/^YOUR_/i, /^GENERATE_/i, /^PLACEHOLDER/i, /^changeme$/i, /^xxx+$/i];

export class EnvMerger {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.baseEnvPath = path.join(rootPath, ".env");
        this.productionEnvPath = path.join(rootPath, ".env.production.local");
    }

    parseEnvFile(filePath) {
        if (!fs.existsSync(filePath)) {
            return {};
        }

        const env = {};
        const lines = fs.readFileSync(filePath, "utf8").split("\n");

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }
            const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match) {
                env[match[1]] = match[2];
            }
        }

        return env;
    }

    isPlaceholder(value) {
        return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
    }

    validateProductionEnv(env) {
        const missing = [];
        const placeholders = [];

        for (const key of REQUIRED_PRODUCTION_VARS) {
            if (!env[key]) {
                missing.push(key);
            } else if (this.isPlaceholder(env[key])) {
                placeholders.push(key);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required production env vars: ${missing.join(", ")}`);
        }

        if (placeholders.length > 0) {
            throw new Error(`Production env vars still have placeholder values: ${placeholders.join(", ")}`);
        }
    }

    merge() {
        const baseEnv = this.parseEnvFile(this.baseEnvPath);
        const productionEnv = this.parseEnvFile(this.productionEnvPath);

        if (Object.keys(productionEnv).length === 0) {
            console.warn("  ⚠️  No .env.production.local found — using .env values");
            return baseEnv;
        }

        const mergedEnv = { ...baseEnv, ...productionEnv };
        this.validateProductionEnv(mergedEnv);
        return mergedEnv;
    }

    getMergedEnv() {
        return this.merge();
    }
}
