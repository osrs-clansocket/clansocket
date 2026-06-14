const REQUIRED_DEPLOY_VARS = [
    "DEPLOY_SSH_HOST",
    "DEPLOY_SSH_USER",
    "DEPLOY_PROJECT_SLUG",
    "DEPLOY_REMOTE_PATH",
    "DEPLOY_PRIMARY_DOMAIN",
    "DEPLOY_MAIN_URL",
    "DEPLOY_THUMBNAIL_URL",
    "DEPLOY_BACKEND_PORT",
    "DEPLOY_PM2_DISCORD_NAME",
    "DEPLOY_PM2_SERVER_NAME",
    "DEPLOY_NGINX_SITE_NAME",
    "DEPLOY_CERT_DOMAIN",
    "DEPLOY_LOG_PREFIX",
];

const OPTIONAL_DEPLOY_VARS = [
    "SSH_PASSPHRASE",
    "DEPLOY_DISCORD_WEBHOOK_URL",
    "NGINX_DISCORD_WEBHOOK_URL",
    "DEPLOY_OPS_WEBHOOK_URL",
];

export function validateDeployEnv() {
    const missing = REQUIRED_DEPLOY_VARS.filter((key) => {
        const value = process.env[key];
        return value === undefined || value === "";
    });

    if (missing.length === 0) return;

    throw new Error(
        `[deploy] Missing required deploy env vars (${missing.length}):\n  - ${missing.join("\n  - ")}\n\n` +
            `Fill these in deployment/config/.env.deploy. See deployment/config/.env.deploy.template for documented stubs.`,
    );
}

export { REQUIRED_DEPLOY_VARS, OPTIONAL_DEPLOY_VARS };
