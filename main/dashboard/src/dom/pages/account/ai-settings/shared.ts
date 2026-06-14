import { createInstance, div, section, type Instance } from "../../../factory";
import { ensureDefaultsLoaded } from "../../../../ai/persona-store/defaults-client.js";
import type { SlotTier } from "../../../../ai/persona-store/index.js";
import type { TabConcerns } from "../../../../state/ai-settings/panel-defs.js";
import { buildConcernSection } from "./panel/index.js";
import { buildTabResetButton } from "./tab-reset.js";

export { hasOwn } from "../../../../ai/persona-store/index.js";

export const ATTR_HIDDEN = "hidden";
export const HIDDEN_TRUE = "";
export const HIDDEN_FALSE: string | null = null;

const ACCORDION_CLASS = "account-ai-settings__accordion";
const TAB_FOOTER_CLASS = "account-ai-settings__tab-footer";

export interface MountConcernsTabOpts {
    host: HTMLElement;
    config: TabConcerns;
    tiers: readonly SlotTier[];
    tierLabel: string;
    tabClass: string;
}

export function mountConcernsTab({ host, config, tiers, tierLabel, tabClass }: MountConcernsTabOpts): void {
    void ensureDefaultsLoaded();
    const accordion = div({ classes: [ACCORDION_CLASS], context: null, meta: null });
    for (const c of config.concerns) accordion.addChild(buildConcernSection(c));
    const footer = div({ classes: [TAB_FOOTER_CLASS], context: null, meta: null }, [
        buildTabResetButton(tiers, tierLabel),
    ]);
    const sec: Instance = section({ classes: [tabClass], context: null, meta: null }, [accordion, footer]);
    createInstance(host).setChildren(sec);
}
