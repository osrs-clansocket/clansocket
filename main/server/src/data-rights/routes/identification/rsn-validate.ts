import { RSN_MAX_LEN } from "../../../database/index.js";

function isRsnChar(c: number): boolean {
    return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 32 || c === 95 || c === 45;
}

export function validRsn(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > RSN_MAX_LEN) return false;
    for (let i = 0; i < trimmed.length; i++) {
        if (!isRsnChar(trimmed.charCodeAt(i))) return false;
    }
    return true;
}
