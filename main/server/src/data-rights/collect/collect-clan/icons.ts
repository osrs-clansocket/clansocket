import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ZipEntry } from "../collect-user/index.js";
import { ICON_EXTS, ICON_TRANSFORM_SIDECAR, type ClanCollectionSummary } from "./types.js";

export function collectClanIcons(
    clanId: string,
    clanDir: string,
    entries: ZipEntry[],
    summary: ClanCollectionSummary,
): void {
    for (const ext of ICON_EXTS) {
        const iconPath = resolve(clanDir, `icon.${ext}`);
        if (existsSync(iconPath)) {
            entries.push({ path: `clans/${clanId}/icon.${ext}`, buffer: readFileSync(iconPath) });
            summary.icon = `icon.${ext}`;
            break;
        }
    }
    for (const ext of ICON_EXTS) {
        const customizedPath = resolve(clanDir, `icon-customized.${ext}`);
        if (existsSync(customizedPath)) {
            entries.push({
                path: `clans/${clanId}/icon-customized.${ext}`,
                buffer: readFileSync(customizedPath),
            });
            break;
        }
    }
    const sidecarPath = resolve(clanDir, ICON_TRANSFORM_SIDECAR);
    if (existsSync(sidecarPath)) {
        const buf = readFileSync(sidecarPath);
        if (buf.length > 0) {
            entries.push({ path: `clans/${clanId}/${ICON_TRANSFORM_SIDECAR}`, buffer: buf });
        }
    }
}
