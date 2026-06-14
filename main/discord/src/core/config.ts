import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { LOG_LEVELS, SECONDS_30_MS } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARENT = "..";
const ROOT = path.join(__dirname, PARENT, PARENT, PARENT, PARENT);
dotenv.config({ path: path.join(ROOT, ".env") });

const RADIX_DECIMAL = 10;
const DEFAULT_API_TIMEOUT = SECONDS_30_MS;
const DEFAULT_RATE_LIMIT_WINDOW = 60000;
const DEFAULT_RATE_LIMIT_MAX = 10;
const DEFAULT_COMMAND_COOLDOWN = 1000;
const DEFAULT_MAX_FILE_SIZE = 10485760;
const DEFAULT_MAX_FILES = 5;
const UNSET = undefined;

function readEnv(key: string, fallback: any = UNSET) {
    const value = process.env[key];
    if (value) {
        return value;
    }
    if (fallback !== UNSET) {
        return fallback;
    }
    throw new Error(`Missing required environment variable: ${key}`);
}

function readEnvNumber(key: string, fallback: any = UNSET) {
    const raw = readEnv(key, fallback !== UNSET ? String(fallback) : UNSET);
    if (typeof raw === "number") {
        return raw;
    }
    if (raw === String(fallback)) {
        return fallback;
    }
    const parsed = parseInt(raw, RADIX_DECIMAL);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number for environment variable: ${key}`);
    }
    return parsed;
}

function readEnvBoolean(key: string, fallback: boolean = false) {
    const raw = readEnv(key, "");
    if (raw === "") {
        return fallback;
    }
    return raw.toLowerCase() === "true";
}

const config = Object.freeze({
    discord: {
        token: readEnv("DISCORD_TOKEN"),
        clientId: readEnv("CLIENT_ID"),
        varezChannelId: readEnv("VAREZ_DISCORD_CHANNEL_ID", ""),
        varezPassive: readEnvBoolean("VAREZ_PASSIVE"),
    },
    api: {
        port: readEnvNumber("SERVER_PORT"),
        enabled: readEnvBoolean("API_ENABLED"),
        timeout: readEnvNumber("API_TIMEOUT", DEFAULT_API_TIMEOUT),
    },
    security: {
        rateLimitWindow: readEnvNumber("RATE_LIMIT_WINDOW", DEFAULT_RATE_LIMIT_WINDOW),
        rateLimitMaxRequests: readEnvNumber("RATE_LIMIT_MAX_REQUESTS", DEFAULT_RATE_LIMIT_MAX),
        commandCooldown: readEnvNumber("COMMAND_COOLDOWN", DEFAULT_COMMAND_COOLDOWN),
    },
    logging: {
        level: readEnv("LOG_LEVEL", LOG_LEVELS.INFO),
        maxFileSize: readEnvNumber("LOG_MAX_FILE_SIZE", DEFAULT_MAX_FILE_SIZE),
        maxFiles: readEnvNumber("LOG_MAX_FILES", DEFAULT_MAX_FILES),
    },
});

export default config;
