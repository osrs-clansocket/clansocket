export const SITE_ACCOUNT_COLUMNS =
    "id, provider, provider_user_id, display_name, avatar_url, created_at, last_login_at";

export type SiteAccountProvider = "github" | "discord" | "passkey";

export interface SiteAccountRow {
    id: string;
    provider: SiteAccountProvider;
    provider_user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: number;
    last_login_at: number | null;
}

export interface SiteAccountUpsertArgs {
    provider: SiteAccountProvider;
    providerUserId: string;
    displayName?: string | null;
    avatarUrl?: string | null;
}

export type OAuthProvider = "github" | "discord";

export interface ProviderRow {
    site_account_id: string;
    provider: OAuthProvider;
    provider_user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    linked_at: number;
}

export interface OAuthLinkArgs {
    provider: OAuthProvider;
    providerUserId: string;
    displayName?: string | null;
    avatarUrl?: string | null;
}

export class OAuthLinkConflictError extends Error {
    constructor(public readonly conflict: "provider_already_linked_elsewhere" | "account_already_has_provider") {
        super(conflict);
    }
}
