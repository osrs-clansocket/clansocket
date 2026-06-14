import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { anchor, div, heading, icon, image, paragraph, span, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import {
    BTN_CLASS,
    BTN_COMPACT_CLASS,
    BTN_PRIMARY_CLASS,
    DISCORD_EMPTY_BADGES_CLASS,
    DISCORD_EMPTY_BADGE_PLUS_CLASS,
    DISCORD_EMPTY_CLASS,
    DISCORD_EMPTY_CTA_WRAP_CLASS,
    DISCORD_EMPTY_DISCORD_ICON_CLASS,
    DISCORD_EMPTY_HEADLINE_CLASS,
    DISCORD_EMPTY_HERO_CLASS,
    DISCORD_EMPTY_INFO_BODY_CLASS,
    DISCORD_EMPTY_INFO_CARD_CLASS,
    DISCORD_EMPTY_INFO_GRID_CLASS,
    DISCORD_EMPTY_INFO_TITLE_CLASS,
    DISCORD_EMPTY_LEDE_CLASS,
    DISCORD_EMPTY_LOGO_CLASS,
    DISCORD_EMPTY_STEP_CLASS,
    DISCORD_EMPTY_STEP_LIST_CLASS,
    DISCORD_EMPTY_STEPS_CLASS,
    DISCORD_EMPTY_STEPS_TITLE_CLASS,
    DISCORD_EMPTY_STEP_NUM_CLASS,
    DISCORD_EMPTY_STEP_TEXT_CLASS,
} from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const LOGO_SRC = "/resources/clan/static_logo.webp";
const LOGO_ALT = "ClanSocket";
const DISCORD_ICON_NAME = "discord-logo";
const DISCORD_ICON_PROVIDER = "ph";
const PLUS_TEXT = "+";

const HEADLINE_TEXT = "Connect ClanSocket to Discord";
const LEDE_TEXT = "ClanSocket. Operational platform for OSRS clans.";

const INFO_1_TITLE = "What it does";
const INFO_1_BODY =
    "Events, audit, member ops, role automation, and webhooks driven from clan-side state. No manual coordination — the dashboard and your discord stay in sync over realtime.";
const INFO_2_TITLE = "What we need";
const INFO_2_BODY =
    "The ClanSocket bot installed in your guild with managed-namespace permissions. Permissions only apply to objects ClanSocket creates; nothing else in your server is touched.";

const STEPS_TITLE = "Setup";
const CTA_LABEL = "Install via Discord OAuth";
const CTA_CONTEXT = "discord bot OAuth install flow trigger";

interface StepDef {
    num: string;
    text: string;
}

const STEPS: ReadonlyArray<StepDef> = [
    { num: "01", text: "Discord opens the install screen — pick your guild and accept the permission scope." },
    { num: "02", text: "The bot joins your server. The dashboard reflects the install in seconds via realtime." },
    { num: "03", text: "Configure capabilities (roles, webhooks, events, channels) per surface as you need them." },
];

function buildHero(): Instance {
    return div({ classes: [DISCORD_EMPTY_HERO_CLASS], context: null, meta: null }, [
        div({ classes: [DISCORD_EMPTY_BADGES_CLASS], context: null, meta: null }, [
            image({
                src: LOGO_SRC,
                alt: LOGO_ALT,
                classes: [DISCORD_EMPTY_LOGO_CLASS],
                context: null,
                meta: null,
            }),
            span({ classes: [DISCORD_EMPTY_BADGE_PLUS_CLASS], text: PLUS_TEXT, context: null, meta: null }),
            icon({
                provider: DISCORD_ICON_PROVIDER,
                name: DISCORD_ICON_NAME,
                classes: [DISCORD_EMPTY_DISCORD_ICON_CLASS],
                ariaHidden: true,
                context: null,
                meta: null,
            }),
        ]),
        heading("h1", {
            classes: [DISCORD_EMPTY_HEADLINE_CLASS],
            text: HEADLINE_TEXT,
            context: null,
            meta: null,
        }),
        paragraph({ classes: [DISCORD_EMPTY_LEDE_CLASS], text: LEDE_TEXT, context: null, meta: null }),
    ]);
}

function buildInfoCard(title: string, body: string): Instance {
    return div({ classes: [GLASS_PANE_CLASS, DISCORD_EMPTY_INFO_CARD_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [DISCORD_EMPTY_INFO_TITLE_CLASS], text: title, context: null, meta: null }),
        paragraph({ classes: [DISCORD_EMPTY_INFO_BODY_CLASS], text: body, context: null, meta: null }),
    ]);
}

function buildInfoGrid(): Instance {
    return div({ classes: [DISCORD_EMPTY_INFO_GRID_CLASS], context: null, meta: null }, [
        buildInfoCard(INFO_1_TITLE, INFO_1_BODY),
        buildInfoCard(INFO_2_TITLE, INFO_2_BODY),
    ]);
}

function buildCta(slug: string): Instance {
    return div({ classes: [DISCORD_EMPTY_CTA_WRAP_CLASS], context: null, meta: null }, [
        anchor({
            href: `/api/auth/site/discord-bot-install/start?slug=${encodeURIComponent(slug)}`,
            text: CTA_LABEL,
            classes: [BTN_CLASS, BTN_PRIMARY_CLASS, BTN_COMPACT_CLASS],
            context: CTA_CONTEXT,
            meta: ["action", "nav"],
        }),
    ]);
}

function buildStep(def: StepDef): Instance {
    return div({ classes: [DISCORD_EMPTY_STEP_CLASS], context: null, meta: null }, [
        span({ classes: [DISCORD_EMPTY_STEP_NUM_CLASS], text: def.num, context: null, meta: null }),
        paragraph({ classes: [DISCORD_EMPTY_STEP_TEXT_CLASS], text: def.text, context: null, meta: null }),
    ]);
}

function buildSteps(): Instance {
    return div({ classes: [DISCORD_EMPTY_STEPS_CLASS], context: null, meta: null }, [
        heading("h3", {
            classes: [DISCORD_EMPTY_STEPS_TITLE_CLASS],
            text: STEPS_TITLE,
            context: null,
            meta: null,
        }),
        div({ classes: [DISCORD_EMPTY_STEP_LIST_CLASS], context: null, meta: null }, STEPS.map(buildStep)),
    ]);
}

export function buildEmptyInstall(slug: string): Instance {
    return div({ classes: [DISCORD_EMPTY_CLASS], context: null, meta: null }, [
        buildHero(),
        buildInfoGrid(),
        buildCta(slug),
        buildSteps(),
    ]);
}
