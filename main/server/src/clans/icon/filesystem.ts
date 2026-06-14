import { existsSync, readFileSync, readdirSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { clanDirPath, ensureClanDirAbsolute } from "../../database/core/database.js";
import type { CustomizeTransform } from "./transform.js";
import { parseTransform } from "./transform.js";

export const ICON_MIME_BY_EXT: Record<string, string> = {
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
};
export const ICON_EXTS = [".webp", ".png", ".jpg", ".svg", ".ico"];
export const ICON_PREFIX_PRISTINE = "icon.";
export const ICON_PREFIX_CUSTOMIZED = "icon-customized.";
export const ICON_TRANSFORM_SIDECAR = "icon-customized.transform.json";

export function findIconAtPrefix(clanId: string, prefix: string): { path: string; ext: string } | null {
    const dir = clanDirPath(clanId);
    for (const ext of ICON_EXTS) {
        const p = resolve(dir, `${prefix.slice(0, -1)}${ext}`);
        if (existsSync(p)) {
            try {
                if (statSync(p).size > 0) return { path: p, ext };
            } catch {}
        }
    }
    return null;
}

export function findIconPath(clanId: string): { path: string; ext: string } | null {
    return findIconAtPrefix(clanId, ICON_PREFIX_CUSTOMIZED) ?? findIconAtPrefix(clanId, ICON_PREFIX_PRISTINE);
}

export function findPristineIconPath(clanId: string): { path: string; ext: string } | null {
    return findIconAtPrefix(clanId, ICON_PREFIX_PRISTINE);
}

function unlinkByPrefix(clanId: string, prefixes: readonly string[]): void {
    const dir = clanDirPath(clanId);
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
        if (!prefixes.some((p) => entry.startsWith(p))) continue;
        try {
            unlinkSync(resolve(dir, entry));
        } catch {}
    }
}

export function removeExistingIcons(clanId: string): void {
    unlinkByPrefix(clanId, [ICON_PREFIX_PRISTINE, ICON_PREFIX_CUSTOMIZED]);
}

export function removeCustomizedIcon(clanId: string): void {
    // ICON_PREFIX_CUSTOMIZED = "icon-customized." which also covers
    // "icon-customized.transform.json" (the sidecar). Single prefix cleans
    // both the image file and its sidecar in one pass.
    unlinkByPrefix(clanId, [ICON_PREFIX_CUSTOMIZED]);
}

export function readTransformSidecar(clanId: string): CustomizeTransform | null {
    const dir = clanDirPath(clanId);
    const p = resolve(dir, ICON_TRANSFORM_SIDECAR);
    if (!existsSync(p)) return null;
    try {
        const raw = readFileSync(p, "utf8");
        if (raw.length === 0) return null;
        const parsed = JSON.parse(raw) as unknown;
        return parseTransform(parsed);
    } catch {
        return null;
    }
}

export function writeTransformSidecar(clanId: string, transform: CustomizeTransform): void {
    const dir = ensureClanDirAbsolute(clanId);
    const p = resolve(dir, ICON_TRANSFORM_SIDECAR);
    writeFileSync(p, JSON.stringify(transform));
}
