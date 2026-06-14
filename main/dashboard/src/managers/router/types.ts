export interface Route {
    path: string;
    render: (path: string) => HTMLElement | Promise<HTMLElement>;
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
    ACCOUNT: "/account",
    DATA_RIGHTS: "/data-rights",
    LOGIN_DEVICE: "/login-device",
    RECOVER: "/recover",
} as const;

export const ROUTE_ENTER_FORWARD = "fx-route-enter-right";
export const ROUTE_ENTER_BACKWARD = "fx-route-enter-left";
