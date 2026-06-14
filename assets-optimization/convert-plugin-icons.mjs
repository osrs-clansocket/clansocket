import sharp from "sharp";
import { mkdirSync } from "fs";
import { resolve } from "path";

const SRC = resolve("public/resources/osrs");
const DST = resolve("../clansocket-plugin/src/main/resources/icons/section");
const SIZE = 16;
const ORANGE = "#ff981f";

const WEBP_MAPPINGS = {
    "icon_hiscores/overall.webp": "skills.png",
    "icon_hiscores/combat.webp": "combat.png",
    "icon_hiscores/hitpoints.webp": "vitals.png",
    "icon_hiscores/collections_logged.webp": "progression.png",
    "icon_hiscores/farming.webp": "farming.png",
};

const SVG_ICONS = {
    "movement.png": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8 1c-2.8 0-5 2.2-5 5 0 3.5 5 9 5 9s5-5.5 5-9c0-2.8-2.2-5-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="${ORANGE}"/></svg>`,
    "inventory.png": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M5 3a3 3 0 0 1 6 0v1h2v11H3V4h2zm1 0v1h4V3a2 2 0 0 0-4 0z" fill="${ORANGE}"/><rect x="4" y="6" width="3" height="3" fill="#1f1f1f"/><rect x="9" y="6" width="3" height="3" fill="#1f1f1f"/><rect x="4" y="10" width="3" height="3" fill="#1f1f1f"/><rect x="9" y="10" width="3" height="3" fill="#1f1f1f"/></svg>`,
    "loot.png": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><ellipse cx="8" cy="4" rx="5" ry="2" fill="${ORANGE}"/><path d="M3 4v3a5 2 0 0 0 10 0V4" fill="${ORANGE}"/><path d="M3 7v3a5 2 0 0 0 10 0V7" fill="${ORANGE}"/><path d="M3 10v3a5 2 0 0 0 10 0v-3" fill="${ORANGE}"/></svg>`,
    "webhooks.png": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M3 11a3 3 0 0 1 0-6c0-2 1.5-3.5 3.5-3.5S10 3 10 5a3 3 0 1 1 0 6z" fill="${ORANGE}"/></svg>`,
    "presets.png": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M2 2h9l3 3v9H2z" fill="${ORANGE}"/><rect x="4" y="2" width="6" height="4" fill="#1f1f1f"/><rect x="6" y="3" width="1" height="2" fill="${ORANGE}"/><rect x="4" y="9" width="8" height="5" fill="#1f1f1f"/></svg>`,
};

mkdirSync(DST, { recursive: true });

for (const [src, dst] of Object.entries(WEBP_MAPPINGS)) {
    const srcPath = resolve(SRC, src);
    const dstPath = resolve(DST, dst);
    await sharp(srcPath).resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(dstPath);
    console.log(`  webp ${src.padEnd(40)} → ${dst}`);
}

for (const [dst, svg] of Object.entries(SVG_ICONS)) {
    const dstPath = resolve(DST, dst);
    await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toFile(dstPath);
    console.log(`  svg                                       → ${dst}`);
}

const total = Object.keys(WEBP_MAPPINGS).length + Object.keys(SVG_ICONS).length;
console.log(`\ndone — ${total} icons → ${DST}`);
