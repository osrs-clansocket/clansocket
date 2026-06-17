import "../../../styles/pages/routes/route-home-page.css";
import {
    anchor,
    button,
    div,
    effect,
    footer,
    heading,
    input,
    paragraph,
    section,
    span,
    type Instance,
} from "../../factory";
import { clanModelIcon } from "../../factory/data-ops/clan-model-icon.js";
import { siteOwnerStore } from "../../../state/identity/stores/site-owner-store.js";
import { uploadSiteEnvelopeJson, uploadSiteImage } from "../../../state/site/site-client.js";
import { ROUTE_HOME_CLASS } from "../../../shared/constants/route-constants.js";
import {
    ROUTE_HOME_ABOUT_TILE_CLASS,
    ROUTE_HOME_BENTO_CLASS,
    ROUTE_HOME_CAPABILITY_DESC_CLASS,
    ROUTE_HOME_CAPABILITY_GRID_CLASS,
    ROUTE_HOME_CAPABILITY_ICON_CLASS,
    ROUTE_HOME_CAPABILITY_TILE_CLASS,
    ROUTE_HOME_CAPABILITY_TITLE_CLASS,
    ROUTE_HOME_COMMUNITY_CLASS,
    ROUTE_HOME_COMMUNITY_CTA_CLASS,
    ROUTE_HOME_COMMUNITY_CTA_ICON_CLASS,
    ROUTE_HOME_COMMUNITY_CTA_LABEL_CLASS,
    ROUTE_HOME_COMMUNITY_TILE_CLASS,
    ROUTE_HOME_CONTAINER_CLASS,
    ROUTE_HOME_CONTROLS_CLASS,
    ROUTE_HOME_CONTROLS_INNER_CLASS,
    ROUTE_HOME_DOWNLOAD_CLASS,
    ROUTE_HOME_DOWNLOAD_GRID_CLASS,
    ROUTE_HOME_DOWNLOAD_ICON_CLASS,
    ROUTE_HOME_DOWNLOAD_LABEL_CLASS,
    ROUTE_HOME_DOWNLOAD_LINUX_CLASS,
    ROUTE_HOME_DOWNLOAD_WIN_CLASS,
    ROUTE_HOME_DOWNLOADS_CLASS,
    ROUTE_HOME_DOWNLOADS_TILE_CLASS,
    ROUTE_HOME_FILE_INPUT_CLASS,
    ROUTE_HOME_HERO_BAND_CLASS,
    ROUTE_HOME_HERO_CLASS,
    ROUTE_HOME_HERO_COPY_CLASS,
    ROUTE_HOME_HERO_LOGO_CLASS,
    ROUTE_HOME_HERO_TAGLINE_CLASS,
    ROUTE_HOME_HERO_TITLE_CLASS,
    ROUTE_HOME_LEGAL_BMAC_CLASS,
    ROUTE_HOME_LEGAL_BMAC_ICON_CLASS,
    ROUTE_HOME_LEGAL_BMAC_LABEL_CLASS,
    ROUTE_HOME_LEGAL_CENTER_CLASS,
    ROUTE_HOME_LEGAL_CLASS,
    ROUTE_HOME_LEGAL_LEFT_CLASS,
    ROUTE_HOME_LEGAL_LINK_CLASS,
    ROUTE_HOME_LEGAL_RIGHT_CLASS,
    ROUTE_HOME_LEGAL_SOCIAL_CLASS,
    ROUTE_HOME_RESOURCE_CLASS,
    ROUTE_HOME_RESOURCE_DESC_CLASS,
    ROUTE_HOME_RESOURCE_ICON_CLASS,
    ROUTE_HOME_RESOURCE_TITLE_CLASS,
    ROUTE_HOME_RESOURCES_CLASS,
    ROUTE_HOME_RESOURCES_TILE_CLASS,
    ROUTE_HOME_SECTION_BODY_CLASS,
    ROUTE_HOME_SECTION_CLASS,
    ROUTE_HOME_SECTION_TITLE_CLASS,
} from "../../../shared/constants/route-home-constants.js";

interface CapabilityCard {
    iconClasses: readonly string[];
    title: string;
    desc: string;
}

const CAPABILITIES: readonly CapabilityCard[] = [
    {
        iconClasses: ["ti", "ti-broadcast"],
        title: "Live telemetry",
        desc: "RuneLite plugin streams positions, chat, drops, and progression in realtime.",
    },
    {
        iconClasses: ["ti", "ti-shield-check"],
        title: "Verified identity",
        desc: "Members prove RSN ownership and clan membership through the plugin, not a form.",
    },
    {
        iconClasses: ["ti", "ti-brand-discord"],
        title: "Discord management",
        desc: "Stage server edits as drafts, publish via queue, automate via event-triggered webhooks.",
    },
    {
        iconClasses: ["ti", "ti-chart-arrows"],
        title: "Wise Old Man backfill",
        desc: "Hiscore data fills in for members the plugin cant see, mobile-only included.",
    },
    {
        iconClasses: ["ti", "ti-cube-3d-sphere"],
        title: "Voxlab clan visuals",
        desc: "In-browser 3D editor for clan badges, banners, and animated identity.",
    },
    {
        iconClasses: ["ti", "ti-message-circle-2"],
        title: "AI clan operator",
        desc: "Varez queries live telemetry, generates reports, and operates the dashboard for you.",
    },
];

const URL_PLUGIN_REPO = "https://github.com/osrs-clansocket/clansocket-plugin";
const URL_MAIN_REPO = "https://github.com/osrs-clansocket/clansocket";
const URL_PLUGIN_HUB = "https://runelite.net/plugin-hub/show/clansocket";
const URL_CLAIM_WIKI = "https://github.com/osrs-clansocket/clansocket-plugin/wiki/Claim-Your-Clan";
const URL_DISCORD_INVITE = "https://discord.gg/qjpQDNe6xE";
const URL_PRIVACY = "/privacy";
const URL_TERMS = "/terms";
const URL_VOXLAB = "/voxlab";
const URL_DOWNLOAD_WIN = "/provide/clansocket-latest.exe";
const URL_DOWNLOAD_LINUX = "/provide/clansocket-latest-linux.tar.gz";
const URL_BMAC = "https://buymeacoffee.com/clansocket";
const URL_GITHUB_DEV = "https://github.com/Varietyz";
const URL_DISCORD_CONTACT = "https://discordapp.com/users/406828985696387081";
const URL_LINKEDIN = "https://www.linkedin.com/in/jay-baleine/";

const SITE_LOGO_RECORD_URL = "/api/site/logo-record";
const SITE_LOGO_THUMBNAIL_URL = "/api/site/logo";
const SITE_LOGO_SLUG = "__site__";

const UPLOAD_ACCEPT = "image/svg+xml,image/png,image/webp,application/json,.svg,.png,.webp,.json";

const MOBILE_LOGO_PAN_X = -0.3;

const BTN_CLASS = "btn";
const BTN_OUTLINE_CLASS = "btn--outline";
const BTN_COMPACT_CLASS = "btn--compact";

const COMMUNITY_BODY =
    "Looking to connect with other OSRS clan owners and staff? Head over to Clan Central for peer support, inter-clan events, and bad-actor reports.";
const DOWNLOADS_BODY = "Don't like web browsers? Grab the latest desktop build for your platform below.";

interface ResourceLink {
    href: string;
    title: string;
    desc: string;
    iconClasses: readonly string[];
}

const RESOURCES: readonly ResourceLink[] = [
    {
        href: URL_PLUGIN_REPO,
        title: "Plugin Source Code",
        desc: "Java · v1.0.0",
        iconClasses: ["mdi", "mdi-language-java"],
    },
    {
        href: URL_PLUGIN_HUB,
        title: "RuneLite Plugin-hub",
        desc: "official plugin-hub listing",
        iconClasses: ["ti", "ti-plug-connected"],
    },
    {
        href: URL_CLAIM_WIKI,
        title: "Wiki",
        desc: "wiki guide for clan owners",
        iconClasses: ["ti", "ti-brand-github"],
    },
    {
        href: URL_MAIN_REPO,
        title: "Platform Source Code",
        desc: "TypeScript · v1.0.0",
        iconClasses: ["ti", "ti-brand-typescript"],
    },
];

function externalAnchor(props: {
    href: string;
    text?: string;
    classes: readonly string[];
    context: string;
    children?: readonly Instance[];
}): Instance {
    const link = anchor(
        {
            href: props.href,
            classes: props.classes,
            text: props.text,
            context: props.context,
            meta: ["nav", "external"],
        },
        props.children ?? [],
    );
    link.setAttr("target", "_blank");
    link.setAttr("rel", "noopener noreferrer");
    return link;
}

function isJsonFile(file: File): boolean {
    return file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
}

async function handleLogoUpload(file: File): Promise<void> {
    const ok = isJsonFile(file) ? await uploadSiteEnvelopeJson(file) : await uploadSiteImage(file);
    if (ok) {
        window.location.reload();
    } else {
        console.warn("[site] logo upload failed");
    }
}

interface UploadParts {
    btn: Instance;
    fileInput: Instance;
}

function buildUploadParts(): UploadParts {
    const fileInput = input({
        classes: [ROUTE_HOME_FILE_INPUT_CLASS],
        type: "file",
        accept: UPLOAD_ACCEPT,
        ariaLabel: "Upload site logo",
        context: "pick an image or voxlab envelope to upload as the site logo",
        meta: ["input"],
        onChange: async () => {
            const file = fileInput.el.files?.[0];
            if (!file) return;
            await handleLogoUpload(file);
        },
    });
    const btn = button({
        classes: [BTN_CLASS, BTN_OUTLINE_CLASS, BTN_COMPACT_CLASS],
        text: "Upload logo",
        type: "button",
        context: "upload an image or voxlab envelope as the site logo",
        meta: ["action"],
        onClick: () => fileInput.el.click(),
    });
    return { btn, fileInput };
}

function buildEditButton(): Instance {
    return anchor({
        href: URL_VOXLAB,
        data: { route: "" },
        classes: [BTN_CLASS, BTN_OUTLINE_CLASS, BTN_COMPACT_CLASS],
        text: "Edit in voxlab",
        context: "open the voxlab editor to tweak the site logo",
        meta: ["nav"],
    });
}

function buildHeroControls(): Instance {
    const { btn: uploadBtn, fileInput } = buildUploadParts();
    const inner = div({ classes: [ROUTE_HOME_CONTROLS_INNER_CLASS], context: null, meta: null }, [
        buildEditButton(),
        uploadBtn,
        fileInput,
    ]);
    const controls = div({ classes: [ROUTE_HOME_CONTROLS_CLASS], context: null, meta: null }, [inner]);
    controls.el.hidden = true;
    const dispose = effect(() => {
        controls.el.hidden = !siteOwnerStore.isOwner$();
    });
    controls.trackDispose(dispose);
    return controls;
}

function buildHeroLogo(): Instance {
    const logoWrapper = div({
        classes: [ROUTE_HOME_HERO_LOGO_CLASS],
        context: "ClanSocket logo",
        meta: ["data"],
    });
    logoWrapper.addChild(
        clanModelIcon({
            slug: SITE_LOGO_SLUG,
            recordUrl: SITE_LOGO_RECORD_URL,
            thumbnailUrl: SITE_LOGO_THUMBNAIL_URL,
            mobilePanX: MOBILE_LOGO_PAN_X,
            context: null,
            meta: null,
        }),
    );
    return logoWrapper;
}

function buildHero(): Instance {
    const title = heading("h1", {
        classes: [ROUTE_HOME_HERO_TITLE_CLASS],
        text: "ClanSocket",
        context: null,
        meta: null,
    });
    const tagline = paragraph({
        classes: [ROUTE_HOME_HERO_TAGLINE_CLASS],
        text: "Live, Open-Source platform for Old School RuneScape clans",
        context: null,
        meta: null,
    });
    const copy = div({ classes: [ROUTE_HOME_HERO_COPY_CLASS], context: null, meta: null }, [title, tagline]);
    return section({ classes: [ROUTE_HOME_HERO_CLASS], context: null, meta: null }, [copy]);
}

function buildCapabilityTile(c: CapabilityCard): Instance {
    return div({ classes: [ROUTE_HOME_CAPABILITY_TILE_CLASS], context: null, meta: null }, [
        span({
            classes: [...c.iconClasses, ROUTE_HOME_CAPABILITY_ICON_CLASS],
            ariaHidden: "true",
            context: null,
            meta: null,
        }),
        span({ classes: [ROUTE_HOME_CAPABILITY_TITLE_CLASS], text: c.title, context: null, meta: null }),
        paragraph({ classes: [ROUTE_HOME_CAPABILITY_DESC_CLASS], text: c.desc, context: null, meta: null }),
    ]);
}

function buildAbout(): Instance {
    const grid = div(
        { classes: [ROUTE_HOME_CAPABILITY_GRID_CLASS], context: null, meta: null },
        CAPABILITIES.map(buildCapabilityTile),
    );
    return section({ classes: [ROUTE_HOME_SECTION_CLASS, ROUTE_HOME_ABOUT_TILE_CLASS], context: null, meta: null }, [
        grid,
    ]);
}

function buildCommunity(): Instance {
    const cta = externalAnchor({
        href: URL_DISCORD_INVITE,
        classes: [ROUTE_HOME_COMMUNITY_CTA_CLASS],
        context: "open the Clan Central discord invite in a new tab",
        children: [
            span({
                classes: ["ti", "ti-brand-discord", ROUTE_HOME_COMMUNITY_CTA_ICON_CLASS],
                ariaHidden: "true",
                context: null,
                meta: null,
            }),
            span({
                classes: [ROUTE_HOME_COMMUNITY_CTA_LABEL_CLASS],
                text: "Join Clan Central →",
                context: null,
                meta: null,
            }),
        ],
    });
    return section(
        {
            classes: [ROUTE_HOME_SECTION_CLASS, ROUTE_HOME_COMMUNITY_CLASS, ROUTE_HOME_COMMUNITY_TILE_CLASS],
            context: null,
            meta: null,
        },
        [
            heading("h2", {
                classes: [ROUTE_HOME_SECTION_TITLE_CLASS],
                text: "Clan Central",
                context: null,
                meta: null,
            }),
            paragraph({
                classes: [ROUTE_HOME_SECTION_BODY_CLASS],
                text: COMMUNITY_BODY,
                context: null,
                meta: null,
            }),
            cta,
        ],
    );
}

function buildDownloadLink(props: {
    href: string;
    label: string;
    iconClasses: readonly string[];
    modifierClass: string;
    context: string;
}): Instance {
    return anchor(
        {
            href: props.href,
            classes: [ROUTE_HOME_DOWNLOAD_CLASS, props.modifierClass],
            context: props.context,
            meta: ["action"],
        },
        [
            span({
                classes: [...props.iconClasses, ROUTE_HOME_DOWNLOAD_ICON_CLASS],
                ariaHidden: "true",
                context: null,
                meta: null,
            }),
            span({
                classes: [ROUTE_HOME_DOWNLOAD_LABEL_CLASS],
                text: props.label,
                context: null,
                meta: null,
            }),
        ],
    );
}

function buildDownloads(): Instance {
    const grid = div({ classes: [ROUTE_HOME_DOWNLOAD_GRID_CLASS], context: null, meta: null }, [
        buildDownloadLink({
            href: URL_DOWNLOAD_WIN,
            label: "Windows",
            iconClasses: ["ti", "ti-brand-windows"],
            modifierClass: ROUTE_HOME_DOWNLOAD_WIN_CLASS,
            context: "download the Windows installer",
        }),
        buildDownloadLink({
            href: URL_DOWNLOAD_LINUX,
            label: "Linux",
            iconClasses: ["ph", "ph-linux-logo"],
            modifierClass: ROUTE_HOME_DOWNLOAD_LINUX_CLASS,
            context: "download the Linux tar.gz",
        }),
    ]);
    return section(
        {
            classes: [ROUTE_HOME_SECTION_CLASS, ROUTE_HOME_DOWNLOADS_CLASS, ROUTE_HOME_DOWNLOADS_TILE_CLASS],
            context: null,
            meta: null,
        },
        [
            heading("h2", {
                classes: [ROUTE_HOME_SECTION_TITLE_CLASS],
                text: "Desktop app",
                context: null,
                meta: null,
            }),
            paragraph({
                classes: [ROUTE_HOME_SECTION_BODY_CLASS],
                text: DOWNLOADS_BODY,
                context: null,
                meta: null,
            }),
            grid,
        ],
    );
}

function buildResourceLink(r: ResourceLink): Instance {
    return externalAnchor({
        href: r.href,
        classes: [ROUTE_HOME_RESOURCE_CLASS],
        context: `open ${r.title} in a new tab`,
        children: [
            span({
                classes: [...r.iconClasses, ROUTE_HOME_RESOURCE_ICON_CLASS],
                ariaHidden: "true",
                context: null,
                meta: null,
            }),
            span({ classes: [ROUTE_HOME_RESOURCE_TITLE_CLASS], text: r.title, context: null, meta: null }),
            span({ classes: [ROUTE_HOME_RESOURCE_DESC_CLASS], text: r.desc, context: null, meta: null }),
        ],
    });
}

function buildResources(): Instance {
    const grid = div(
        { classes: [ROUTE_HOME_RESOURCES_CLASS], context: null, meta: null },
        RESOURCES.map(buildResourceLink),
    );
    return section(
        { classes: [ROUTE_HOME_SECTION_CLASS, ROUTE_HOME_RESOURCES_TILE_CLASS], context: null, meta: null },
        [
            heading("h2", {
                classes: [ROUTE_HOME_SECTION_TITLE_CLASS],
                text: "Resources",
                context: null,
                meta: null,
            }),
            grid,
        ],
    );
}

function buildSocialLink(props: { href: string; iconClasses: readonly string[]; ariaLabel: string }): Instance {
    const link = anchor(
        {
            href: props.href,
            classes: [ROUTE_HOME_LEGAL_SOCIAL_CLASS],
            ariaLabel: props.ariaLabel,
            context: `open ${props.ariaLabel} in a new tab`,
            meta: ["nav", "external"],
        },
        [
            span({
                classes: props.iconClasses,
                ariaHidden: "true",
                context: null,
                meta: null,
            }),
        ],
    );
    link.setAttr("target", "_blank");
    link.setAttr("rel", "noopener noreferrer");
    return link;
}

function buildLegal(): Instance {
    const bmac = externalAnchor({
        href: URL_BMAC,
        classes: [ROUTE_HOME_LEGAL_BMAC_CLASS],
        context: "support the project on Buy Me a Coffee in a new tab",
        children: [
            span({
                classes: ["ti", "ti-coffee", ROUTE_HOME_LEGAL_BMAC_ICON_CLASS],
                ariaHidden: "true",
                context: null,
                meta: null,
            }),
            span({
                classes: [ROUTE_HOME_LEGAL_BMAC_LABEL_CLASS],
                text: "Buy me a coffee",
                context: null,
                meta: null,
            }),
        ],
    });
    const left = div({ classes: [ROUTE_HOME_LEGAL_LEFT_CLASS], context: null, meta: null }, [bmac]);

    const privacy = anchor({
        href: URL_PRIVACY,
        data: { route: "" },
        classes: [ROUTE_HOME_LEGAL_LINK_CLASS],
        text: "Privacy",
        context: "open the privacy policy",
        meta: ["nav"],
    });
    const terms = anchor({
        href: URL_TERMS,
        data: { route: "" },
        classes: [ROUTE_HOME_LEGAL_LINK_CLASS],
        text: "Terms",
        context: "open the terms of service",
        meta: ["nav"],
    });
    const center = div({ classes: [ROUTE_HOME_LEGAL_CENTER_CLASS], context: null, meta: null }, [privacy, terms]);

    const right = div({ classes: [ROUTE_HOME_LEGAL_RIGHT_CLASS], context: null, meta: null }, [
        buildSocialLink({
            href: URL_GITHUB_DEV,
            iconClasses: ["ti", "ti-brand-github"],
            ariaLabel: "GitHub",
        }),
        buildSocialLink({
            href: URL_DISCORD_CONTACT,
            iconClasses: ["ti", "ti-brand-discord"],
            ariaLabel: "Discord",
        }),
        buildSocialLink({
            href: URL_LINKEDIN,
            iconClasses: ["ti", "ti-brand-linkedin"],
            ariaLabel: "LinkedIn",
        }),
    ]);

    return footer({ classes: [ROUTE_HOME_LEGAL_CLASS], context: null, meta: null }, [left, center, right]);
}

function renderHome(): HTMLElement {
    const logoWrapper = buildHeroLogo();
    const heroBand = div({ classes: [ROUTE_HOME_HERO_BAND_CLASS], context: null, meta: null }, [
        logoWrapper,
        buildHero(),
    ]);
    const heroControls = buildHeroControls();
    const bento = div({ classes: [ROUTE_HOME_BENTO_CLASS], context: null, meta: null }, [
        buildAbout(),
        buildCommunity(),
        buildDownloads(),
        buildResources(),
        buildLegal(),
    ]);
    const container = div({ classes: [ROUTE_HOME_CONTAINER_CLASS], context: null, meta: null }, [bento]);
    return div({ classes: [ROUTE_HOME_CLASS], context: null, meta: null }, [heroBand, heroControls, container]).el;
}

export { renderHome };
