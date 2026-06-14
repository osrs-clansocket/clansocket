type UaRule = { needles: readonly string[]; not?: readonly string[]; name: string };

const PLATFORM_RULES: readonly UaRule[] = [
    { needles: ["Windows"], name: "Windows" },
    { needles: ["Mac OS X", "Macintosh"], name: "macOS" },
    { needles: ["iPhone"], name: "iPhone" },
    { needles: ["iPad"], name: "iPad" },
    { needles: ["Android"], name: "Android" },
    { needles: ["CrOS"], name: "ChromeOS" },
    { needles: ["Linux"], name: "Linux" },
];

const BROWSER_RULES: readonly UaRule[] = [
    { needles: ["Edg/"], name: "Edge" },
    { needles: ["OPR/", "Opera"], name: "Opera" },
    { needles: ["Brave/"], name: "Brave" },
    { needles: ["Chrome/"], not: ["Chromium/"], name: "Chrome" },
    { needles: ["Firefox/"], name: "Firefox" },
    { needles: ["Safari/"], name: "Safari" },
];

function matchUa(ua: string, rules: readonly UaRule[]): string | null {
    const has = (needle: string): boolean => ua.includes(needle);
    for (const rule of rules) {
        if (rule.needles.some(has) && !rule.not?.some(has)) return rule.name;
    }
    return null;
}

export function deriveDeviceName(): string {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const platform = matchUa(ua, PLATFORM_RULES);
    const browser = matchUa(ua, BROWSER_RULES);
    if (browser && platform) return `${browser} on ${platform}`;
    if (browser) return browser;
    if (platform) return platform;
    return "unknown device";
}
