import { CANONICAL_URL as BAKED_URL } from "./prod-config.js";

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error("env var " + name + " required (set in .env)");
    return v;
}

function buildDevUrl() {
    if (process.env.DASHBOARD_DEV_URL) return process.env.DASHBOARD_DEV_URL;
    return "https://localhost:" + requireEnv("DASHBOARD_PORT");
}

export const WINDOW = {
    DEFAULT_WIDTH: 1280,
    DEFAULT_HEIGHT: 720,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
};

export const DEV_SERVER = {
    get URL() {
        return buildDevUrl();
    },
};

export const PROD_SERVER = {
    get URL() {
        return BAKED_URL || requireEnv("CANONICAL_URL");
    },
};

export const PATHS = {
    USER_DATA_DIR: "clansocket-electron",
    ICON_RELATIVE: "../icon.ico",
};
