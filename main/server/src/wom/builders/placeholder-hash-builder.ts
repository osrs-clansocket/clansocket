const PLACEHOLDER_HASH_PREFIX = "wom:";
const SEGMENT_SEPARATOR = ":";

export function buildPlaceholderAccountHash(groupId: number, rsnCanonical: string): string {
    return PLACEHOLDER_HASH_PREFIX + String(groupId) + SEGMENT_SEPARATOR + rsnCanonical;
}

export function isPlaceholderAccountHash(hash: string): boolean {
    return hash.startsWith(PLACEHOLDER_HASH_PREFIX);
}
