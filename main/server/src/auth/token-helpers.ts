import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_GROUP_SIZE = 3;
const TOKEN_GROUPS = 3;

function pickChars(count: number): string {
    const bytes = randomBytes(count);
    let out = "";
    for (let i = 0; i < count; i += 1) {
        out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
    }
    return out;
}

export function generatePluginAuthToken(): string {
    const groups: string[] = [];
    for (let g = 0; g < TOKEN_GROUPS; g += 1) {
        groups.push(pickChars(TOKEN_GROUP_SIZE));
    }
    return groups.join("-");
}

export function hashToken(plaintext: string): string {
    return createHash("sha256").update(plaintext).digest("hex");
}

export function verifyTokenHash(plaintext: string, stored: string): boolean {
    const actual = Buffer.from(hashToken(plaintext), "hex");
    const expected = Buffer.from(stored, "hex");
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
}
