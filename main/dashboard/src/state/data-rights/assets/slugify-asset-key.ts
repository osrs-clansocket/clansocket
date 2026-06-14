const CHAR_UPPER_A = 65;
const CHAR_UPPER_Z = 90;
const CHAR_LOWER_A = 97;
const CHAR_LOWER_Z = 122;
const CHAR_DIGIT_0 = 48;
const CHAR_DIGIT_9 = 57;
const ASCII_CASE_OFFSET = 32;
const UNDERSCORE = "_";
const EMPTY = "";

export function slugifyAssetKey(value: unknown): string {
    if (value === null || value === undefined) return EMPTY;
    const s = String(value);
    let out = EMPTY;
    let lastUnderscore = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        if (ch >= CHAR_LOWER_A && ch <= CHAR_LOWER_Z) {
            out += s.charAt(i);
            lastUnderscore = false;
        } else if (ch >= CHAR_UPPER_A && ch <= CHAR_UPPER_Z) {
            out += String.fromCharCode(ch + ASCII_CASE_OFFSET);
            lastUnderscore = false;
        } else if (ch >= CHAR_DIGIT_0 && ch <= CHAR_DIGIT_9) {
            out += s.charAt(i);
            lastUnderscore = false;
        } else if (!lastUnderscore && out.length > 0) {
            out += UNDERSCORE;
            lastUnderscore = true;
        }
    }
    if (out.endsWith(UNDERSCORE)) out = out.slice(0, -1);
    return out;
}
