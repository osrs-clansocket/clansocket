import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILTERS_DIR = path.join(__dirname, "..", "config", "filters");

// Reads <target>-inclusions.json + <target>-exclusions.json from
// deployment/config/filters/ and returns { allow, disallow } string arrays.
// Missing file -> empty array (operation simply has no entries on that axis).
// Bad JSON or non-array contents -> throw (refuse to run on corrupt config).
export function loadFilter(targetName) {
    if (typeof targetName !== "string" || targetName.length === 0) {
        throw new Error("loadFilter: targetName must be a non-empty string");
    }
    return {
        allow: readListFile(targetName, "inclusions"),
        disallow: readListFile(targetName, "exclusions"),
    };
}

function readListFile(targetName, axis) {
    const filePath = path.join(FILTERS_DIR, `${targetName}-${axis}.json`);
    if (!fs.existsSync(filePath)) return [];
    let raw;
    try {
        raw = fs.readFileSync(filePath, "utf8");
    } catch (err) {
        throw new Error(`loadFilter: failed to read ${filePath}: ${err.message}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`loadFilter: invalid JSON in ${filePath}: ${err.message}`);
    }
    if (!Array.isArray(parsed)) {
        throw new Error(`loadFilter: ${filePath} must contain a JSON array, got ${typeof parsed}`);
    }
    for (const entry of parsed) {
        if (typeof entry !== "string" || entry.length === 0) {
            throw new Error(`loadFilter: ${filePath} contains a non-string or empty entry`);
        }
    }
    return parsed;
}

export function listAvailableTargets() {
    if (!fs.existsSync(FILTERS_DIR)) return [];
    const seen = new Set();
    for (const f of fs.readdirSync(FILTERS_DIR)) {
        if (f.endsWith("-inclusions.json")) seen.add(f.slice(0, -"-inclusions.json".length));
        else if (f.endsWith("-exclusions.json")) seen.add(f.slice(0, -"-exclusions.json".length));
    }
    return [...seen].sort();
}
