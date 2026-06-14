const SPACE_LIKE = new Set([" ", " ", " ", " ", "　"]);
const ZERO_WIDTH = new Set(["​", "‌", "‍", "﻿"]);
const ASCII_SPACE = " ";
const EMPTY = "";

export function canonicalRsn(raw: string): string {
    const normalized = raw.normalize("NFKC");
    let out = EMPTY;
    for (const ch of normalized) {
        if (SPACE_LIKE.has(ch)) {
            out += ASCII_SPACE;
            continue;
        }
        if (ZERO_WIDTH.has(ch)) continue;
        out += ch;
    }
    return out.trim();
}
