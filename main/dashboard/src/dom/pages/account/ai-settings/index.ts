import { button, createInstance, div, heading, section, type Instance } from "../../../factory";
import { DOMAIN, ENGAGEMENT, IDENTITY, POLICY } from "../../../../ai/persona-store/index.js";
import { OPERATION_TAB, PERSONA_TAB, PREFERENCES_TAB } from "../../../../state/ai-settings/panel-defs.js";
import { renderVarezProfile } from "../../../clans/account/varez-profile/index.js";
import { mountMemoryTab } from "./memory/index.js";
import { mountModesTab } from "./modes/index.js";
import { mountConcernsTab } from "./shared.js";

const TAB_KEYS = ["memory", "profile", "modes", "persona", "operation", "preferences"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
    memory: "Memory",
    profile: "User",
    modes: "Modes",
    persona: "Persona",
    operation: "Operation",
    preferences: "Preferences",
};

const TAB_MOUNTERS: Record<TabKey, (host: HTMLElement) => void> = {
    memory: mountMemoryTab,
    profile: renderVarezProfile,
    modes: mountModesTab,
    persona: (host) =>
        mountConcernsTab({
            host,
            config: PERSONA_TAB,
            tiers: [IDENTITY],
            tierLabel: "persona",
            tabClass: "account-ai-settings__persona",
        }),
    operation: (host) =>
        mountConcernsTab({
            host,
            config: OPERATION_TAB,
            tiers: [POLICY],
            tierLabel: "operation",
            tabClass: "account-ai-settings__operation",
        }),
    preferences: (host) =>
        mountConcernsTab({
            host,
            config: PREFERENCES_TAB,
            tiers: [ENGAGEMENT, DOMAIN],
            tierLabel: "preferences",
            tabClass: "account-ai-settings__preferences",
        }),
};

const DEFAULT_TAB: TabKey = "memory";
const CARD_CLASS = "account__card";
const CARD_VARIANT_CLASS = "account__card--ai-settings";
const SECTION_TITLE_CLASS = "account__section-title";
const TAB_NAV_CLASS = "clans-manage__tabs";
const TAB_CLASS = "clans-manage__tab";
const TAB_ACTIVE_CLASS = "clans-manage__tab--active";
const BODY_CLASS = "clans-manage__body";

function tabClasses(isActive: boolean): readonly string[] {
    return isActive ? [TAB_CLASS, TAB_ACTIVE_CLASS] : [TAB_CLASS];
}

function buildTabButton(key: TabKey, isActive: boolean, onSelect: (k: TabKey) => void): Instance {
    return button({
        classes: tabClasses(isActive),
        role: "tab",
        ariaSelected: isActive ? "true" : "false",
        data: { "tab-key": key },
        text: TAB_LABELS[key],
        context: `switch to the ${TAB_LABELS[key]} tab`,
        meta: ["nav"],
        onClick: () => onSelect(key),
    });
}

function renderTabContent(host: HTMLElement, key: TabKey): void {
    createInstance(host).clear();
    TAB_MOUNTERS[key](host);
}

function buildAiSettingsCard(): Instance {
    let active: TabKey = DEFAULT_TAB;
    const body = div({ classes: [BODY_CLASS], data: { "active-tab": active }, context: null, meta: null });
    const nav = div({ classes: [TAB_NAV_CLASS], role: "tablist", context: null, meta: null });

    function selectTab(next: TabKey): void {
        if (next === active) return;
        active = next;
        body.el.dataset.activeTab = active;
        for (const btn of Array.from(nav.el.querySelectorAll<HTMLButtonElement>("button[data-tab-key]"))) {
            const isActive = btn.dataset.tabKey === active;
            btn.classList.toggle(TAB_ACTIVE_CLASS, isActive);
            createInstance(btn).setAttr("aria-selected", isActive ? "true" : "false");
        }
        renderTabContent(body.el, active);
    }

    for (const key of TAB_KEYS) nav.addChild(buildTabButton(key, key === active, selectTab));

    const card = section({ classes: [CARD_CLASS, CARD_VARIANT_CLASS], context: null, meta: null }, [
        heading("h2", { classes: [SECTION_TITLE_CLASS], text: "AI Settings", context: null, meta: null }),
        nav,
        body,
    ]);

    renderTabContent(body.el, active);
    return card;
}

export { buildAiSettingsCard };
