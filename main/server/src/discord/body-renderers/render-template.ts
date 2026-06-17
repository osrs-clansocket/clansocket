const OPEN_BRACE = "{";
const CLOSE_BRACE = "}";
const MAX_TOKEN_LENGTH = 64;

export interface TokenSource {
    readonly [key: string]: string | number | boolean | null | undefined;
}

function findCloseBrace(s: string, from: number): number {
    let i = from;
    while (i < s.length) {
        if (s[i] === CLOSE_BRACE) return i;
        if (s[i] === OPEN_BRACE) return -1;
        i++;
    }
    return -1;
}

function tryReplaceToken(template: string, i: number, tokens: TokenSource): { value: string; nextIdx: number } | null {
    if (template[i] !== OPEN_BRACE) return null;
    const closeIdx = findCloseBrace(template, i + 1);
    if (closeIdx === -1) return null;
    if (closeIdx - i > MAX_TOKEN_LENGTH + 1) return null;
    const key = template.slice(i + 1, closeIdx);
    const value = tokens[key];
    if (value === undefined) return null;
    return { value: value === null ? "" : String(value), nextIdx: closeIdx + 1 };
}

export function renderTemplate(template: string, tokens: TokenSource): string {
    let out = "";
    let i = 0;
    while (i < template.length) {
        const replacement = tryReplaceToken(template, i, tokens);
        if (replacement !== null) {
            out += replacement.value;
            i = replacement.nextIdx;
        } else {
            out += template[i];
            i++;
        }
    }
    return out;
}
