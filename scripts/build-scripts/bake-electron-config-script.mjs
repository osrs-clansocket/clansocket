import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..", "..");
const ENV_PATH = resolve(APP_ROOT, ".env.production.local");
const OUT_PATH = resolve(APP_ROOT, "main", "electron", "src", "prod-config.js");

function parseEnvLine(line) {
    const eq = line.indexOf("=");
    if (eq <= 0) return null;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2) {
        const first = value.charAt(0);
        const last = value.charAt(value.length - 1);
        if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
            value = value.slice(1, value.length - 1);
        }
    }
    return { key, value };
}

function loadEnv(path) {
    const text = readFileSync(path, "utf8");
    const lines = text.split("\n");
    const out = {};
    for (const raw of lines) {
        const line = raw.trim();
        if (line.length === 0) continue;
        if (line.charAt(0) === "#") continue;
        const parsed = parseEnvLine(line);
        if (parsed === null) continue;
        out[parsed.key] = parsed.value;
    }
    return out;
}

const env = loadEnv(ENV_PATH);
const url = env.CANONICAL_URL;
if (!url) {
    process.stderr.write("bake-electron-config: CANONICAL_URL missing from " + ENV_PATH + "\n");
    process.exit(1);
}

const content = "export const CANONICAL_URL = " + JSON.stringify(url) + ";\n";
writeFileSync(OUT_PATH, content, "utf8");
process.stdout.write("baked CANONICAL_URL into " + OUT_PATH + "\n");
