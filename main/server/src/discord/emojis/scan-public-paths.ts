import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

const PUBLIC_BASE = join(process.cwd(), "public");

const EMOJI_SUBDIRS = ["resources/osrs/emojis", "resources/osrs/anim_emojis", "resources/osrs/enlarged_emojis"];

function buildPathMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const sub of EMOJI_SUBDIRS) {
        const dir = join(PUBLIC_BASE, sub);
        if (!existsSync(dir)) continue;
        for (const file of readdirSync(dir)) {
            const full = join(dir, file);
            if (!statSync(full).isFile()) continue;
            const name = basename(file, extname(file)).toLowerCase();
            if (!map.has(name)) map.set(name, `/${sub}/${file}`);
        }
    }
    return map;
}

const PUBLIC_PATHS = buildPathMap();

export function lookupPublicPath(emojiName: string): string | null {
    return PUBLIC_PATHS.get(emojiName.toLowerCase()) ?? null;
}
