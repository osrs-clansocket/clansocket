import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(HERE, "..", "npm-scripts.json");
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

const explicit = process.argv[2];
const askedForList = explicit === "--list";
const name = askedForList ? null : (explicit ?? process.env.npm_lifecycle_event ?? null);

if (askedForList || name === null) {
    for (const [category, scripts] of Object.entries(config)) {
        process.stdout.write(`\n# ${category}\n`);
        for (const scriptName of Object.keys(scripts)) {
            process.stdout.write(`  npm run ${scriptName}\n`);
        }
    }
    process.exit(0);
}

let command = null;
for (const scripts of Object.values(config)) {
    if (Object.hasOwn(scripts, name)) {
        command = scripts[name];
        break;
    }
}

if (command === null) {
    process.stderr.write(`script "${name}" not found in npm-scripts.json\n`);
    process.exit(1);
}

const result = spawnSync(command, { shell: true, stdio: "inherit" });
process.exit(result.status ?? 1);
