export type RouteChangeFreq = "daily" | "weekly" | "monthly" | "yearly";

export interface RouteSeoData {
    title: string;
    description: string;
    image?: string;
    hidden?: boolean;
    changefreq?: RouteChangeFreq;
    priority?: number;
}

export type RouteSeoResolver = (path: string) => Promise<RouteSeoData | null>;

export interface Route {
    path: string;
    render: (path: string) => HTMLElement | Promise<HTMLElement>;
    seo: RouteSeoData | RouteSeoResolver;
    match?: (path: string) => boolean;
    guard?: (path: string) => boolean | Promise<boolean>;
    onReject?: string | ((path: string) => string);
}

const CLANS_PATH = "/clans";

export const AppRoutes = {
    HOME: "/",
    CLAN: CLANS_PATH,
    CLAN_MANAGE: CLANS_PATH,
    CLAN_LIVE: CLANS_PATH,
    CLAN_VOXLAB: CLANS_PATH,
    ACCOUNT: "/account",
    DATA_RIGHTS: "/data-rights",
    LOGIN_DEVICE: "/login-device",
    RECOVER: "/recover",
    PRIVACY: "/privacy",
    TERMS: "/terms",
} as const;

export const ROUTE_ENTER_FORWARD = "fx-route-enter-right";
export const ROUTE_ENTER_BACKWARD = "fx-route-enter-left";
