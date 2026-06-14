export const NGINX_CONSTANTS = {
    REMOTE_SITES_AVAILABLE_DIR: "/etc/nginx/sites-available",
    REMOTE_SITES_ENABLED_DIR: "/etc/nginx/sites-enabled",
    get REMOTE_CONFIG_PATH() {
        return `/etc/nginx/sites-available/${process.env.DEPLOY_NGINX_SITE_NAME}`;
    },
    get REMOTE_ENABLED_PATH() {
        return `/etc/nginx/sites-enabled/${process.env.DEPLOY_NGINX_SITE_NAME}`;
    },
    get BACKUP_TEMP_PREFIX() {
        return `/tmp/nginx-${process.env.DEPLOY_NGINX_SITE_NAME}-backup-`;
    },
    get SITE_NAME() {
        return process.env.DEPLOY_NGINX_SITE_NAME;
    },
    PREVIEW_LENGTH: 1000,

    COMMANDS: {
        TEST: "nginx -t",
        RELOAD: "systemctl reload nginx",
        STATUS: "systemctl is-active nginx",
    },

    EXPECTED_STATUS: "active",

    FILE_PERMISSIONS: {
        CONFIG_FILE: "644",
    },
};
