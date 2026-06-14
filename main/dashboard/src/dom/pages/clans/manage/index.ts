import { buildAuditTab } from "./audit";
import { buildDiscordTab } from "./discord";

type TabBuilder = (slug: string) => HTMLElement;

const AUDIT_KEY = "audit";

const REGISTRY: Record<string, TabBuilder> = {
    [AUDIT_KEY]: buildAuditTab,
    discord: buildDiscordTab,
};

const TAB_KEYS: readonly string[] = Object.keys(REGISTRY)
    .filter((k) => k !== AUDIT_KEY)
    .concat(AUDIT_KEY);
const DEFAULT_TAB = "discord";

function resolveTabKey(input: string | null): string {
    if (input === null) return DEFAULT_TAB;
    return TAB_KEYS.includes(input) ? input : DEFAULT_TAB;
}

function buildTab(key: string, slug: string): HTMLElement {
    const builder = REGISTRY[key] ?? REGISTRY[DEFAULT_TAB]!;
    return builder(slug);
}

export { TAB_KEYS, DEFAULT_TAB, resolveTabKey, buildTab };
export type { TabBuilder };
