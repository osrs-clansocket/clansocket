import path from "path";

export const SSH_CONSTANTS = {
    get HOST() {
        return process.env.DEPLOY_SSH_HOST;
    },
    get USER() {
        return process.env.DEPLOY_SSH_USER;
    },
    KEY_PATH: path.join(process.env.USERPROFILE || process.env.HOME, ".ssh", "id_rsa"),
    get PASSPHRASE() {
        return process.env.SSH_PASSPHRASE || "";
    },
};

export const DISCORD_CONFIG = {
    get WEBHOOK_URL() {
        return process.env.DEPLOY_DISCORD_WEBHOOK_URL || "";
    },
    get NGINX_WEBHOOK_URL() {
        return process.env.NGINX_DISCORD_WEBHOOK_URL || "";
    },
    get OPS_WEBHOOK_URL() {
        return process.env.DEPLOY_OPS_WEBHOOK_URL || "";
    },
    UPDATES_ROLE: "",
};
