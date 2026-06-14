export interface ContainerItem {
    id: number;
    qty: number;
    name?: string | null;
}

export interface SkillEntry {
    name: string;
    level: number;
    boosted: number;
    xp: number;
}

export type PluginLoginState =
    | "LOGGED_IN"
    | "LOGGED_OUT"
    | "LOGIN_SCREEN"
    | "LOGIN_SCREEN_AUTHENTICATOR"
    | "LOGGING_IN"
    | "LOADING"
    | "HOPPING"
    | "CONNECTION_LOST"
    | "STARTING"
    | "UNKNOWN";
