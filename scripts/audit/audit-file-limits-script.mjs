import fs from "node:fs";
import path from "node:path";

const roots = [
    { name: "server", root: "main/server/src", ext: ".ts" },
    { name: "dashboard", root: "main/dashboard/src", ext: ".ts" },
    { name: "discord", root: "main/discord/src", ext: ".js" },
];

function walk(dir, ext, out) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full, ext, out);
        else if (ent.isFile() && ent.name.endsWith(ext)) out.push(full);
    }
}

const hits = [];
for (const { name, root, ext } of roots) {
    if (!fs.existsSync(root)) continue;
    const files = [];
    walk(root, ext, files);
    for (const f of files) {
        const lines = fs.readFileSync(f, "utf8").split("\n").length;
        if (lines > 150) hits.push({ size: lines, file: f.replace(/\\/g, "/"), name });
    }
}

hits.sort((a, b) => b.size - a.size);
for (const h of hits) console.log(`${String(h.size).padStart(4)} ${h.name.padEnd(10)} ${h.file}`);
console.log(`\nTotal: ${hits.length} files over 150 lines`);
