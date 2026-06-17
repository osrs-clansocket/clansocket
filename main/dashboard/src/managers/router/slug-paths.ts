const CLAN_PREFIX = "/clans/";
const SINGULAR_CLAN_PREFIX = "/clan/";
const MANAGE_SEGMENT = "/manage";
const LIVE_SEGMENT = "/live";
const VOXLAB_SEGMENT = "/voxlab";
const CHAR_DASH = "-".charCodeAt(0);
const CHAR_DIGIT_LO = "0".charCodeAt(0);
const CHAR_DIGIT_HI = "9".charCodeAt(0);
const CHAR_LOWER_LO = "a".charCodeAt(0);
const CHAR_LOWER_HI = "z".charCodeAt(0);
const CHAR_UPPER_LO = "A".charCodeAt(0);
const CHAR_UPPER_HI = "Z".charCodeAt(0);

function inRange(c: number, lo: number, hi: number): boolean {
    return c >= lo && c <= hi;
}

function isSlugChar(c: number): boolean {
    return (
        inRange(c, CHAR_LOWER_LO, CHAR_LOWER_HI) ||
        inRange(c, CHAR_UPPER_LO, CHAR_UPPER_HI) ||
        inRange(c, CHAR_DIGIT_LO, CHAR_DIGIT_HI) ||
        c === CHAR_DASH
    );
}

function trimTrailingSlash(s: string): string {
    return s.endsWith("/") ? s.slice(0, -1) : s;
}

function allSlugChars(s: string): boolean {
    for (let i = 0; i < s.length; i++) {
        if (!isSlugChar(s.charCodeAt(i))) return false;
    }
    return true;
}

function stripQuery(path: string): string {
    const qAt = path.indexOf("?");
    return qAt === -1 ? path : path.slice(0, qAt);
}

function slugBody(path: string): string {
    const stripped = stripQuery(path);
    if (!stripped.startsWith(CLAN_PREFIX)) return "";
    const body = trimTrailingSlash(stripped.slice(CLAN_PREFIX.length));
    if (body.length === 0) return "";
    return allSlugChars(body) ? body : "";
}

export function matchClanPath(path: string): boolean {
    return slugBody(path).length > 0;
}

export function clanSlugFromPath(path: string): string {
    return slugBody(path).toLowerCase();
}

function slugBodyWithSegment(path: string, segment: string): string {
    const stripped = stripQuery(path);
    if (!stripped.startsWith(CLAN_PREFIX)) return "";
    const afterPrefix = stripped.slice(CLAN_PREFIX.length);
    const segAt = afterPrefix.indexOf(segment);
    if (segAt <= 0) return "";
    const slug = afterPrefix.slice(0, segAt);
    if (!allSlugChars(slug)) return "";
    const tail = afterPrefix.slice(segAt + segment.length);
    if (tail.length > 0 && !tail.startsWith("/")) return "";
    return slug;
}

function manageSlugBody(path: string): string {
    return slugBodyWithSegment(path, MANAGE_SEGMENT);
}

function liveSlugBody(path: string): string {
    return slugBodyWithSegment(path, LIVE_SEGMENT);
}

export function matchClanManagePath(path: string): boolean {
    return manageSlugBody(path).length > 0;
}

export function clanSlugFromManagePath(path: string): string {
    return manageSlugBody(path).toLowerCase();
}

export function matchClanLivePath(path: string): boolean {
    return liveSlugBody(path).length > 0;
}

export function clanSlugFromLivePath(path: string): string {
    return liveSlugBody(path).toLowerCase();
}

function voxlabSlugBody(path: string): string {
    return slugBodyWithSegment(path, VOXLAB_SEGMENT);
}

export function matchClanVoxlabPath(path: string): boolean {
    return voxlabSlugBody(path).length > 0;
}

export function clanSlugFromVoxlabPath(path: string): string {
    return voxlabSlugBody(path).toLowerCase();
}

function manageTailSegments(path: string): readonly string[] {
    const slug = manageSlugBody(path);
    if (slug.length === 0) return [];
    const afterSlug = path.slice(CLAN_PREFIX.length + slug.length + MANAGE_SEGMENT.length);
    const tail = trimTrailingSlash(afterSlug);
    if (tail.length === 0) return [];
    if (!tail.startsWith("/")) return [];
    return tail.slice(1).split("/");
}

export function manageTabFromPath(path: string): string | null {
    const segs = manageTailSegments(path);
    if (segs.length === 0) return null;
    const tab = segs[0]!;
    return allSlugChars(tab) ? tab : null;
}

export function manageSubTabFromPath(path: string): string | null {
    const segs = manageTailSegments(path);
    if (segs.length < 2) return null;
    const subTab = segs[1]!;
    if (subTab.length === 0) return null;
    return allSlugChars(subTab) ? subTab : null;
}

export function normalizeClanPath(path: string): string {
    return path.startsWith(SINGULAR_CLAN_PREFIX) ? CLAN_PREFIX + path.slice(SINGULAR_CLAN_PREFIX.length) : path;
}
