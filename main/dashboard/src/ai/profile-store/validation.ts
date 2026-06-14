const RESERVED_IDENTITY_PREFIXES: ReadonlySet<string> = new Set(["rules", "rules.always", "rules.never"]);

export function isReservedIdentityPrefix(path: string): boolean {
    return RESERVED_IDENTITY_PREFIXES.has(path);
}

export function isValidIdentityKey(key: string): boolean {
    if (key.length === 0) return false;
    if (key.startsWith(".") || key.endsWith(".")) return false;
    let prevDot = false;
    for (let i = 0; i < key.length; i++) {
        const c = key[i]!;
        const isLower = c >= "a" && c <= "z";
        const isUpper = c >= "A" && c <= "Z";
        const isDigit = c >= "0" && c <= "9";
        const isPunct = c === "." || c === "_" || c === "-";
        if (!isLower && !isUpper && !isDigit && !isPunct) return false;
        if (c === "." && prevDot) return false;
        prevDot = c === ".";
    }
    return true;
}
