import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const glyphsPath = path.resolve(here, "..", "..", "main", "dashboard", "src", "data", "icon-glyphs.json");
const outPath = path.resolve(here, "..", "..", "main", "dashboard", "src", "styles", "auto-gen", "icons.css");

const glyphs = JSON.parse(fs.readFileSync(glyphsPath, "utf-8"));
const header = ".bi::before, [class*=\" bi-\"]::before, [class^=\"bi-\"]::before { display: inline-block; font-family: bootstrap-icons, sans-serif; font-style: normal; font-weight: 400; font-variant: normal; text-transform: none; line-height: 1; vertical-align: -0.125em }";
const lines = [header];
const names = Object.keys(glyphs).sort();
for (const name of names) {
    const hex = glyphs[name].toString(16);
    lines.push(`.bi-${name}::before { content: "\\${hex}" }`);
}
fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`wrote ${names.length} icon rules to ${outPath}`);
