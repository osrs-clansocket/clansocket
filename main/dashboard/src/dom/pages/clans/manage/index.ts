import { buildAuditTab } from "./audit";
import { buildConfigTab } from "./config";
import { buildDiscordTab } from "./discord";
import { buildIdentityTab } from "./identity";
import { buildPluginDataTab } from "./plugin-data";
import { buildWiseOldManTab } from "./wise-old-man";

type TabBuilder = (slug: string, subTab?: string | null) => HTMLElement;

const AUDIT_KEY = "audit";

const REGISTRY: Record<string, TabBuilder> = {
    identity: buildIdentityTab,
    "plugin-config": buildConfigTab,
    discord: buildDiscordTab,
    "wise-old-man": buildWiseOldManTab,
    "plugin-data": buildPluginDataTab,
    [AUDIT_KEY]: buildAuditTab,
};

const TAB_KEYS: readonly string[] = Object.keys(REGISTRY)
    .filter((k) => k !== AUDIT_KEY)
    .concat(AUDIT_KEY);
const DEFAULT_TAB = TAB_KEYS[0]!;

function resolveTabKey(input: string | null): string {
    if (input === null) return DEFAULT_TAB;
    return TAB_KEYS.includes(input) ? input : DEFAULT_TAB;
}

function buildTab(key: string, slug: string, subTab?: string | null): HTMLElement {
    const builder = REGISTRY[key] ?? REGISTRY[DEFAULT_TAB]!;
    return builder(slug, subTab);
}

export { TAB_KEYS, DEFAULT_TAB, resolveTabKey, buildTab };
export type { TabBuilder };
