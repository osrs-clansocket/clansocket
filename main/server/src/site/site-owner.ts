const ENV_KEY = "SITE_OWNER_ACCOUNT_ID";

export function isSiteOwner(siteAccountId: string | null | undefined): boolean {
    const owner = process.env[ENV_KEY];
    if (owner === undefined || owner.length === 0) return false;
    if (!siteAccountId || siteAccountId.length === 0) return false;
    return siteAccountId === owner;
}
