import {
    button,
    derived,
    div,
    effect,
    expandWithFade,
    heading,
    icon,
    signal,
    span,
    type Instance,
} from "../../../../factory";
import { modesStore } from "../../../../../ai/modes-store/index.js";
import { personaStore } from "../../../../../ai/persona-store/index.js";
import type { ConcernDef } from "../../../../../state/ai-settings/panel-defs.js";
import { ATTR_HIDDEN, HIDDEN_FALSE, HIDDEN_TRUE } from "../shared.js";
import { buildRow } from "./composers/field-composer.js";

const SECTION_CLASS = "account-ai-settings__concern";
const SECTION_OPEN_CLASS = "account-ai-settings__concern--open";
const HEAD_CLASS = "account-ai-settings__concern-head";
const HEAD_ICON_CLASS = "account-ai-settings__concern-icon";
const HEAD_TITLE_CLASS = "account-ai-settings__concern-title";
const HEAD_BADGE_CLASS = "account-ai-settings__concern-badge";
const HEAD_CHEVRON_CLASS = "account-ai-settings__concern-chevron";
const BODY_CLASS = "account-ai-settings__concern-body";

function concernHasOverride(def: ConcernDef): boolean {
    for (const r of def.rows) {
        if (typeof r === "string") {
            if (personaStore.isOverride(r)) return true;
        } else {
            for (const key of r) {
                if (personaStore.isOverride(key)) return true;
            }
        }
    }
    return false;
}

export function buildConcernSection(def: ConcernDef): Instance {
    const open = signal<boolean>(def.defaultOpen === true);
    const body = div({ classes: [BODY_CLASS], context: null, meta: null });
    for (const row of def.rows) body.addChild(buildRow(row));

    const iconEl = icon({ name: def.icon, classes: [HEAD_ICON_CLASS], context: null, meta: null });
    const titleEl = heading("h3", { classes: [HEAD_TITLE_CLASS], text: def.title, context: null, meta: null });
    const badge = span({ classes: [HEAD_BADGE_CLASS], text: "overridden", context: null, meta: null });
    const chevron = icon({
        name: "chevron-down",
        classes: [HEAD_CHEVRON_CLASS],
        context: null,
        meta: null,
    });
    const head = button({
        ariaLabel: `Toggle ${def.title} section`,
        classes: [HEAD_CLASS],
        type: "button",
        ariaExpanded: derived(() => (open() ? "true" : "false")),
        ariaControls: `concern-body-${def.id}`,
        context: `toggle ${def.title} section`,
        meta: ["disclosure"],
        onClick: () => open.set(!open()),
    });
    head.addChild(iconEl);
    head.addChild(titleEl);
    head.addChild(badge);
    head.addChild(chevron);

    body.el.id = `concern-body-${def.id}`;

    const section = div({ classes: [SECTION_CLASS], data: { "concern-id": def.id }, context: null, meta: null }, [
        head,
        body,
    ]);

    section.trackDispose(
        effect(() => {
            section.toggleClass(SECTION_OPEN_CLASS, open());
            expandWithFade(body.el, open());
        }),
    );
    section.trackDispose(
        effect(() => {
            badge.setAttr(ATTR_HIDDEN, concernHasOverride(def) ? HIDDEN_FALSE : HIDDEN_TRUE);
        }),
    );
    if (def.requiresMode !== undefined) {
        const required = def.requiresMode;
        section.trackDispose(
            effect(() => {
                section.setAttr(ATTR_HIDDEN, modesStore.isOn(required) ? HIDDEN_FALSE : HIDDEN_TRUE);
            }),
        );
    }

    return section;
}
