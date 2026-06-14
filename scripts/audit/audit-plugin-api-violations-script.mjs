import { execSync } from "node:child_process";
let raw;
try {
    raw = execSync(`npx eslint --config shared/config/eslint.server.config.js "main/server/src/plugin-api/**/*.ts" -f json`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
    });
} catch (e) {
    raw = e.stdout?.toString() || "";
}
const start = raw.indexOf("[");
const json = JSON.parse(raw.slice(start));
const counts = {};
for (const f of json) {
    for (const m of f.messages) {
        if (m.ruleId === "lvi/file-limits" || m.ruleId === "lvi/folder-limits") {
            const k = f.filePath.replace(/.*plugin-api./, "").replace(/\\/g, "/");
            counts[k] = counts[k] || {};
            counts[k][m.ruleId] = (m.message.match(/(\d+) lines|files \(/)?.[0]) || "violated";
        }
    }
}
for (const k of Object.keys(counts).sort()) {
    console.log(k + ": " + JSON.stringify(counts[k]));
}
