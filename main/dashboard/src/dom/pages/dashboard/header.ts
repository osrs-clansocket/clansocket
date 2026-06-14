import { anchor, button, div, header, heading, image, nav, span } from "../../factory";
import { buildZoomControl } from "./zoom-control.js";
import {
    DASH_BRAND_CLASS,
    DASH_CONTROLS_CLASS,
    DASH_HEADER_CLASS,
    DASH_LOGIN_CLASS,
    DASH_LOGIN_GROUP_CLASS,
    DASH_LOGIN_OPTION_CLASS,
    DASH_LOGIN_OPTION_TEXT_CLASS,
    DASH_LOGIN_POPOVER_CLASS,
    DASH_LOGO_CLASS,
    DASH_LOGO_LINK_CLASS,
    DASH_LOGOUT_CLASS,
    DASH_NAV_CLASS,
    DASH_NAV_ICON_CLASS,
    DASH_NAV_ICON_TEMPLATE_CLASS,
    DASH_NAV_RAIL_CLASS,
    DASH_NAV_VIEWPORT_CLASS,
    DASH_SUBTITLE_CLASS,
    DASH_TITLE_CLASS,
    ICONBTN_CLASS,
} from "../../../shared/constants/dashboard-shell-constants.js";

const BS_ICON = "bi";

interface LoginOptionSpec {
    provider: string;
    iconClass: string;
    label: string;
}

const LOGIN_OPTIONS: LoginOptionSpec[] = [
    { provider: "github", iconClass: "bi-github", label: "GitHub" },
    { provider: "discord", iconClass: "bi-discord", label: "Discord" },
    { provider: "device", iconClass: "bi-fingerprint", label: "Device" },
];

function bsSpan(iconClass: string): HTMLElement {
    return span({ classes: [BS_ICON, iconClass], context: null, meta: null }).el;
}

function buildLoginOption(spec: LoginOptionSpec): HTMLElement {
    return button(
        {
            classes: [DASH_LOGIN_OPTION_CLASS],
            data: { "login-provider": spec.provider },
            context: `sign in with ${spec.label}`,
            meta: ["action", "account"],
        },
        [
            bsSpan(spec.iconClass),
            span({ classes: [DASH_LOGIN_OPTION_TEXT_CLASS], text: spec.label, context: null, meta: null }).el,
        ],
    ).el;
}

function buildLoginGroup(): HTMLElement {
    const loginBtn = button(
        {
            classes: [DASH_LOGIN_CLASS, ICONBTN_CLASS],
            ariaLabel: "Sign in",
            title: "Sign in",
            hidden: "",
            data: { login: "" },
            context: "open the sign-in provider menu",
            meta: ["action", "account"],
        },
        [bsSpan("bi-box-arrow-in-right")],
    );
    const popover = div(
        {
            classes: [DASH_LOGIN_POPOVER_CLASS],
            hidden: "",
            data: { "login-popover": "" },
            context: null,
            meta: null,
        },
        LOGIN_OPTIONS.map(buildLoginOption),
    );
    return div({ classes: [DASH_LOGIN_GROUP_CLASS], context: null, meta: null }, [loginBtn.el, popover.el]).el;
}

function buildLogoutBtn(): HTMLElement {
    return button(
        {
            classes: [DASH_LOGOUT_CLASS, ICONBTN_CLASS],
            ariaLabel: "Sign out",
            title: "Sign out",
            hidden: "",
            data: { logout: "" },
            context: "sign out of your account",
            meta: ["action", "account"],
        },
        [bsSpan("bi-box-arrow-right")],
    ).el;
}

function buildNavSection(): HTMLElement {
    const navRail = div({ classes: [DASH_NAV_RAIL_CLASS], data: { "nav-rail": "" }, context: null, meta: null });
    const navIconTemplate = button(
        {
            classes: [DASH_NAV_ICON_CLASS, DASH_NAV_ICON_TEMPLATE_CLASS],
            ariaLabel: "Navigation item",
            hidden: "",
            data: { "nav-icon-template": "" },
            context: "navigate to this clan's page",
            meta: ["nav", "clan"],
        },
        [
            span({ classes: [BS_ICON], ariaHidden: "true", data: { "nav-icon-glyph": "" }, context: null, meta: null })
                .el,
        ],
    );
    return nav(
        { classes: [DASH_NAV_CLASS], ariaLabel: "Site navigation", role: "navigation", context: null, meta: null },
        [div({ classes: [DASH_NAV_VIEWPORT_CLASS], context: null, meta: null }, [navRail.el]).el, navIconTemplate.el],
    ).el;
}

function buildBrand(): HTMLElement {
    return div({ classes: [DASH_BRAND_CLASS], context: null, meta: null }, [
        anchor(
            {
                href: "/",
                classes: [DASH_LOGO_LINK_CLASS],
                ariaLabel: "Home",
                title: "Home",
                context: "navigate to the homepage",
                meta: ["nav"],
            },
            [image({ src: "/favicon.ico", alt: "ClanSocket logo", classes: [DASH_LOGO_CLASS] }).el],
        ).el,
        heading("h1", { classes: [DASH_TITLE_CLASS], text: "ClanSocket", context: null, meta: null }).el,
        span({ classes: [DASH_SUBTITLE_CLASS], key: "dash-subtitle", text: "", context: null, meta: null }).el,
    ]).el;
}

function buildControls(): HTMLElement {
    return div({ classes: [DASH_CONTROLS_CLASS], context: null, meta: null }, [
        buildZoomControl(),
        buildLoginGroup(),
        buildLogoutBtn(),
    ]).el;
}

export function buildHeader(): HTMLElement {
    return header({ classes: [DASH_HEADER_CLASS], context: null, meta: null }, [
        buildBrand(),
        buildNavSection(),
        buildControls(),
    ]).el;
}
