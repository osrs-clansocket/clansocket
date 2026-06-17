import "../../../../../styles/pages/clans/manage/config-page.css";
import {
    BTN_VARIANT_OUTLINE,
    BTN_VARIANT_PRIMARY,
    button,
    derived,
    div,
    effect,
    heading,
    image,
    paragraph,
    rsnTag,
    signal,
    span,
    type Instance,
} from "../../../../factory";
import { buildGlassCheck } from "../../../../forms/glass/inputs/glass-check.js";
import { IS_ACTIVE_CLASS } from "../../../../../shared/constants/state-modifier-constants.js";
import { PLUGIN_CONFIG_FIELDS, type PluginConfigField } from "../../../../../shared/constants/plugin-config-fields.js";
import {
    clearGlobalPreset,
    clearMemberOverride,
    fetchPluginConfig,
    publishGlobalPreset,
    publishMemberOverride,
    type PluginConfigMember,
    type PluginConfigState,
} from "../../../../../state/clans/plugin-config/client.js";

const ROOT_CLASS = "clans-manage__config";
const LOADING_CLASS = "clans-manage__config-loading";
const SECTION_CLASS = "clans-manage__config-section";
const SECTION_TITLE_CLASS = "clans-manage__config-section-title";
const SECTION_META_CLASS = "clans-manage__config-section-meta";
const SCROLL_CLASS = "clans-manage__config-scroll";
const FIELD_LIST_CLASS = "clans-manage__config-field-list";
const FIELD_ROW_CLASS = "clans-manage__config-field-row";
const FIELD_LABEL_CLASS = "clans-manage__config-field-label";
const FIELD_DESC_CLASS = "clans-manage__config-field-desc";
const FIELD_CONTROL_CLASS = "clans-manage__config-field-control";
const ROSTER_GRID_CLASS = "clans-manage__config-roster";
const ROSTER_CARD_CLASS = "clans-manage__config-roster-card";
const ROSTER_CARD_BODY_CLASS = "clans-manage__config-roster-card-body";
const ROSTER_CARD_GLOBE_CLASS = "clans-manage__config-roster-card-globe";
const ROSTER_CARD_GLOBAL_LABEL_CLASS = "clans-manage__config-roster-card-global-label";
const ROSTER_CARD_MARKER_CLASS = "clans-manage__config-roster-card-marker";
const ACTIONS_CLASS = "clans-manage__config-actions";
const STATUS_CLASS = "clans-manage__config-status";

const LOADING_TEXT = "Loading config…";
const GLOBAL_TITLE = "Global";
const GLOBE_ICON_SRC = "/resources/osrs/game_objects_xl/1024/front/7090__globe_of_gielinor.png";
const GLOBE_ICON_ALT = "Globe";
const CUSTOM_MARKER_TEXT = "custom";
const STATUS_SAVING = "Publishing…";
const STATUS_SAVED = "Published.";
const STATUS_FAILED = "Publish failed.";
const STATUS_CLEARED = "Cleared.";

type Values = Record<string, string | number | boolean>;

type Scope = { kind: "global" } | { kind: "members"; set: ReadonlySet<string> };

const GLOBAL_SCOPE: Scope = { kind: "global" };

function seedValuesFromFields(): Values {
    const out: Values = {};
    for (const f of PLUGIN_CONFIG_FIELDS) out[f.key] = f.defaultValue;
    return out;
}

function applyServerValues(seed: Values, server: Values | undefined): Values {
    const out: Values = { ...seed };
    if (server) {
        for (const k of Object.keys(server)) out[k] = server[k]!;
    }
    return out;
}

function effectiveValuesForScope(scope: Scope, cfg: PluginConfigState): Values {
    const globalSeed = applyServerValues(seedValuesFromFields(), cfg.global?.preset.values);
    if (scope.kind === "global") return globalSeed;
    if (scope.set.size === 1) {
        const [hash] = scope.set;
        const override = cfg.overrides.find((o) => o.accountHash === hash);
        return applyServerValues(globalSeed, override?.preset.values);
    }
    return globalSeed;
}

function scopeEquals(a: Scope, b: Scope): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === "global") return true;
    const aSet = a.set as ReadonlySet<string>;
    const bSet = (b as { set: ReadonlySet<string> }).set;
    if (aSet.size !== bSet.size) return false;
    for (const h of aSet) if (!bSet.has(h)) return false;
    return true;
}

function scopeTitle(scope: Scope, members: readonly PluginConfigMember[]): string {
    if (scope.kind === "global") return GLOBAL_TITLE;
    if (scope.set.size === 0) return GLOBAL_TITLE;
    const rsns: string[] = [];
    for (const m of members) if (scope.set.has(m.accountHash)) rsns.push(m.rsn);
    if (rsns.length === 0) return `${scope.set.size} members`;
    if (rsns.length === 1) return rsns[0]!;
    if (rsns.length <= 3) return rsns.join(", ");
    return `${rsns[0]} + ${rsns.length - 1} others`;
}

function publishLabelForScope(scope: Scope): string {
    if (scope.kind === "global") return "Publish to clan";
    if (scope.set.size === 1) return "Publish member override";
    return `Publish to ${scope.set.size} members`;
}

function clearLabelForScope(scope: Scope): string {
    if (scope.kind === "global") return "Clear global preset";
    if (scope.set.size === 1) return "Clear member override";
    return `Clear ${scope.set.size} overrides`;
}

function metaTextForScope(scope: Scope, cfg: PluginConfigState | null): string {
    if (!cfg) return "";
    if (scope.kind === "global") {
        const g = cfg.global;
        return g ? `Last published ${new Date(g.updatedAt).toLocaleString()}` : "No global preset published yet.";
    }
    if (scope.set.size === 1) {
        const [hash] = scope.set;
        const override = cfg.overrides.find((o) => o.accountHash === hash);
        return override
            ? `Override last published ${new Date(override.updatedAt).toLocaleString()}`
            : "No override yet — inherits global.";
    }
    return `Editing override for ${scope.set.size} members.`;
}

function buildFieldRow(field: PluginConfigField, values: ReturnType<typeof signal<Values>>): Instance {
    return div({ classes: [FIELD_ROW_CLASS], context: null, meta: null }, [
        div({ classes: [FIELD_LABEL_CLASS], context: null, meta: null }, [
            span({ text: field.label, context: null, meta: null }),
            paragraph({ classes: [FIELD_DESC_CLASS], text: field.description, context: null, meta: null }),
        ]),
        div(
            { classes: [FIELD_CONTROL_CLASS], context: null, meta: null },
            field.kind === "boolean"
                ? [
                      buildGlassCheck({
                          name: field.key,
                          ariaLabel: field.label,
                          checked: () => Boolean(values()[field.key]),
                          onChange: (next: boolean) => {
                              values.set({ ...values(), [field.key]: next });
                          },
                      }),
                  ]
                : [],
        ),
    ]);
}

function buildRosterCardBody(member: PluginConfigMember | null): Instance {
    if (member === null) {
        return span({ classes: [ROSTER_CARD_BODY_CLASS], context: null, meta: null }, [
            image({
                src: GLOBE_ICON_SRC,
                alt: GLOBE_ICON_ALT,
                classes: [ROSTER_CARD_GLOBE_CLASS],
                context: null,
                meta: null,
            }),
            span({ classes: [ROSTER_CARD_GLOBAL_LABEL_CLASS], text: GLOBAL_TITLE, context: null, meta: null }),
        ]);
    }
    return rsnTag({
        rsn: member.rsn,
        rank: member.rank,
        size: "sm",
        classes: [ROSTER_CARD_BODY_CLASS],
        context: null,
        meta: null,
    });
}

function buildRosterCard(
    member: PluginConfigMember | null,
    scope: ReturnType<typeof signal<Scope>>,
    state: ReturnType<typeof signal<PluginConfigState | null>>,
): Instance {
    const isGlobal = member === null;
    const accountHash = isGlobal ? null : member.accountHash;
    const card = div({ classes: [ROSTER_CARD_CLASS], context: null, meta: null }, [
        buildRosterCardBody(member),
        span({ classes: [ROSTER_CARD_MARKER_CLASS], text: "", context: null, meta: null }),
    ]);
    card.setAttr("role", "button");
    card.setAttr("tabindex", "0");
    card.el.addEventListener("click", () => {
        const current = scope();
        if (isGlobal) {
            scope.set(GLOBAL_SCOPE);
            return;
        }
        const hash = accountHash!;
        if (current.kind === "global") {
            scope.set({ kind: "members", set: new Set([hash]) });
            return;
        }
        const next = new Set(current.set);
        if (next.has(hash)) next.delete(hash);
        else next.add(hash);
        scope.set(next.size === 0 ? GLOBAL_SCOPE : { kind: "members", set: next });
    });
    card.trackDispose(
        effect(() => {
            const s = scope();
            const active = isGlobal ? s.kind === "global" : s.kind === "members" && s.set.has(accountHash!);
            card.toggleClass(IS_ACTIVE_CLASS, active);
        }),
    );
    if (!isGlobal) {
        card.trackDispose(
            effect(() => {
                const overrides = state()?.overrides ?? [];
                const hasOverride = overrides.some((o) => o.accountHash === accountHash);
                const markerEl = card.el.querySelector<HTMLElement>(`.${ROSTER_CARD_MARKER_CLASS}`);
                if (markerEl) markerEl.textContent = hasOverride ? CUSTOM_MARKER_TEXT : "";
            }),
        );
    }
    return card;
}

function buildRosterGrid(
    scope: ReturnType<typeof signal<Scope>>,
    state: ReturnType<typeof signal<PluginConfigState | null>>,
): Instance {
    const host = div({ classes: [ROSTER_GRID_CLASS], context: null, meta: null });
    host.trackDispose(
        effect(() => {
            const members = state()?.members ?? [];
            const cards: Instance[] = [buildRosterCard(null, scope, state)];
            for (const m of members) cards.push(buildRosterCard(m, scope, state));
            host.setChildren(...cards);
        }),
    );
    return host;
}

async function dispatchPublish(slug: string, scope: Scope, values: Values): Promise<boolean> {
    if (scope.kind === "global") return publishGlobalPreset(slug, values);
    const hashes = Array.from(scope.set);
    const results = await Promise.all(hashes.map((h) => publishMemberOverride(slug, h, values)));
    return results.every((r) => r);
}

async function dispatchClear(slug: string, scope: Scope): Promise<boolean> {
    if (scope.kind === "global") return clearGlobalPreset(slug);
    const hashes = Array.from(scope.set);
    const results = await Promise.all(hashes.map((h) => clearMemberOverride(slug, h)));
    return results.every((r) => r);
}

function buildSection(
    slug: string,
    state: ReturnType<typeof signal<PluginConfigState | null>>,
    scope: ReturnType<typeof signal<Scope>>,
    values: ReturnType<typeof signal<Values>>,
    status: ReturnType<typeof signal<string>>,
): Instance {
    const titleEl = heading("h2", {
        classes: [SECTION_TITLE_CLASS],
        text: derived(() => scopeTitle(scope(), state()?.members ?? [])),
        context: null,
        meta: null,
    });
    const metaEl = paragraph({
        classes: [SECTION_META_CLASS],
        text: derived(() => metaTextForScope(scope(), state())),
        context: null,
        meta: null,
    });
    const fieldList = div(
        { classes: [FIELD_LIST_CLASS], context: null, meta: null },
        PLUGIN_CONFIG_FIELDS.map((f) => buildFieldRow(f, values)),
    );
    const rosterGrid = buildRosterGrid(scope, state);
    const scroll = div({ classes: [SCROLL_CLASS], context: null, meta: null }, [fieldList, rosterGrid]);
    const publishBtn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        text: derived(() => publishLabelForScope(scope())),
        context: "publish the plugin config to the active scope",
        meta: ["action", "plugin-config"],
        onClick: async () => {
            status.set(STATUS_SAVING);
            const ok = await dispatchPublish(slug, scope(), values());
            status.set(ok ? STATUS_SAVED : STATUS_FAILED);
            if (ok) {
                const next = await fetchPluginConfig(slug);
                state.set(next);
            }
        },
    });
    const clearBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: derived(() => clearLabelForScope(scope())),
        context: "clear the plugin config for the active scope",
        meta: ["action", "plugin-config"],
        onClick: async () => {
            status.set(STATUS_SAVING);
            const ok = await dispatchClear(slug, scope());
            status.set(ok ? STATUS_CLEARED : STATUS_FAILED);
            if (ok) {
                const next = await fetchPluginConfig(slug);
                state.set(next);
                values.set(effectiveValuesForScope(scope(), next));
            }
        },
    });
    const statusEl = paragraph({ classes: [STATUS_CLASS], text: derived(() => status()), context: null, meta: null });
    return div({ classes: [SECTION_CLASS], context: null, meta: null }, [
        titleEl,
        metaEl,
        scroll,
        div({ classes: [ACTIONS_CLASS], context: null, meta: null }, [publishBtn, clearBtn, statusEl]),
    ]);
}

export function buildConfigTab(slug: string): HTMLElement {
    const host = div({ classes: [ROOT_CLASS], context: null, meta: null }, [
        paragraph({ classes: [LOADING_CLASS], text: LOADING_TEXT, context: null, meta: null }),
    ]);
    const state = signal<PluginConfigState | null>(null);
    const scope = signal<Scope>(GLOBAL_SCOPE);
    const values = signal<Values>(seedValuesFromFields());
    const status = signal<string>("");
    let lastScope: Scope = GLOBAL_SCOPE;
    effect(() => {
        const s = scope();
        const cfg = state();
        if (!cfg) return;
        if (!scopeEquals(s, lastScope)) {
            values.set(effectiveValuesForScope(s, cfg));
            lastScope = s;
        }
    });
    void fetchPluginConfig(slug).then((next) => {
        state.set(next);
        values.set(effectiveValuesForScope(GLOBAL_SCOPE, next));
        host.setChildren(buildSection(slug, state, scope, values, status));
    });
    return host.el;
}
