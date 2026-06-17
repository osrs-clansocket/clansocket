import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, "..", "..");
const SITE_DATA_DIR = path.join(SERVER_ROOT, "data", "site");
const LOGO_THUMBNAIL = "logo.png";
const LOGO_RECORD = "logo-record.json";
const LOGO_SCALE = "logo-scale.json";

function ensureSiteDir(): void {
    if (!fs.existsSync(SITE_DATA_DIR)) {
        fs.mkdirSync(SITE_DATA_DIR, { recursive: true });
    }
}

export function siteLogoThumbnailPath(): string {
    return path.join(SITE_DATA_DIR, LOGO_THUMBNAIL);
}

export function siteLogoRecordPath(): string {
    return path.join(SITE_DATA_DIR, LOGO_RECORD);
}

export function siteLogoScalePath(): string {
    return path.join(SITE_DATA_DIR, LOGO_SCALE);
}

export function readSiteLogoRecord(): string | null {
    const p = siteLogoRecordPath();
    if (!fs.existsSync(p)) return null;
    try {
        return fs.readFileSync(p, "utf8");
    } catch {
        return null;
    }
}

export function writeSiteLogo(thumbnailBuffer: Buffer, envelopeRaw: string): void {
    ensureSiteDir();
    fs.writeFileSync(siteLogoThumbnailPath(), thumbnailBuffer);
    fs.writeFileSync(siteLogoRecordPath(), envelopeRaw, "utf8");
}

export function writeSiteEnvelopeOnly(envelopeRaw: string): void {
    ensureSiteDir();
    fs.writeFileSync(siteLogoRecordPath(), envelopeRaw, "utf8");
}

export function writeSiteThumbnailOnly(thumbnailBuffer: Buffer): void {
    ensureSiteDir();
    fs.writeFileSync(siteLogoThumbnailPath(), thumbnailBuffer);
}

export function clearSiteEnvelope(): void {
    const p = siteLogoRecordPath();
    if (fs.existsSync(p)) {
        fs.unlinkSync(p);
    }
}

export function readSiteLogoScale(): number | null {
    const p = siteLogoScalePath();
    if (!fs.existsSync(p)) return null;
    try {
        const raw = fs.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw) as { scale?: unknown };
        const scale = parsed.scale;
        if (typeof scale !== "number" || !Number.isFinite(scale)) return null;
        return scale;
    } catch {
        return null;
    }
}

export function writeSiteLogoScale(scale: number): void {
    ensureSiteDir();
    fs.writeFileSync(siteLogoScalePath(), JSON.stringify({ scale }), "utf8");
}
