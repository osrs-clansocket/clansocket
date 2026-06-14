import { formatDisplayTimestamp } from "../logging/time-formatter.js";

export function buildWebhookUsername(status) {
    const brand = process.env.DEPLOY_BRAND || process.env.DEPLOY_PRIMARY_DOMAIN;
    return `${brand} | ${status} | ${formatDisplayTimestamp()}`;
}
