export const DEPLOYMENT_CONSTANTS = {
    get REMOTE_PATH() {
        return process.env.DEPLOY_REMOTE_PATH;
    },
    get PROJECT_SLUG() {
        return process.env.DEPLOY_PROJECT_SLUG;
    },
    get BACKEND_PORT() {
        return process.env.DEPLOY_BACKEND_PORT;
    },
    BACKUP_RETENTION_COUNT: 5,
    UPLOAD_CONCURRENCY: 50,
    PM2_MAX_RESTARTS: 10,

    PM2: {
        get DISCORD_NAME() {
            return process.env.DEPLOY_PM2_DISCORD_NAME;
        },
        get SERVER_NAME() {
            return process.env.DEPLOY_PM2_SERVER_NAME;
        },
    },

    URLS: {
        get MAIN() {
            return process.env.DEPLOY_MAIN_URL;
        },
        get THUMBNAIL() {
            return process.env.DEPLOY_THUMBNAIL_URL;
        },
    },

    MONITORING: {
        SECURITY_HEADERS: "https://securityheaders.com/",
        SSL_TEST: "https://www.ssllabs.com/ssltest/",
        PERFORMANCE: "https://pagespeed.web.dev/",
        HTTP_OBSERVATORY: "https://developer.mozilla.org/en-US/observatory",
        HARDENIZE: "https://www.hardenize.com/",
    },
};

export const TIMING_CONSTANTS = {
    MILLISECONDS_TO_SECONDS: 1000,
};

export const LOG_CONSTANTS = {
    MESSAGE_TRUNCATE_LENGTH: 900,
};

export const NPM_CONFIG = {
    INSTALL_FLAGS: "--omit=dev",
};

export const TEXT_LIMITS = {
    GIT_MESSAGE_MAX_LENGTH: 50,
    GIT_MESSAGE_TRUNCATE_LENGTH: 47,
};
