import { randomBytes } from "node:crypto";
import { getClanBySlug, slugify } from "../../../database/index.js";

export function deriveClaimSlug(displayName: string, clanId: string): string {
    const base = slugify(displayName);
    const existing = getClanBySlug(base);
    if (!existing || existing.id === clanId) return base;
    return `${base}-${randomBytes(3).toString("hex")}`;
}
