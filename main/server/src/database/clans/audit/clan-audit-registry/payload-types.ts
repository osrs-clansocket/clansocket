import type { CustomizeTransform } from "../../../../clans/icon/transform.js";

export type AuditSource = "server" | "client" | "system" | "discord";

export interface AuditCommonPayload {
    causedBy?: string;
    requestId?: string;
    elapsedMs?: number;
    revertsAuditId?: number;
}

export interface BeforeAfter<T> {
    before: T | null;
    after: T;
}

export interface BrandingState {
    iconKind: string | null;
    iconValue: string | null;
    color: string | null;
}

export interface RosterChangedPayload extends AuditCommonPayload {
    memberCount: number;
    diffCount: number;
    fromFingerprint: string | null;
    capturedByAccountHash: string;
}

export interface ClaimCompletedPayload extends AuditCommonPayload {
    displayName: string;
    slug: string;
}

export interface ClaimTransferredPayload extends AuditCommonPayload {
    newOwnerSiteAccountId: string;
    previousOwnerSiteAccountId: string | null;
}

export interface ManagerGrantedPayload extends AuditCommonPayload {
    role: string;
    grantedVia: string;
    priorRole?: string | null;
    matchedRsn?: string;
    matchedRank?: string;
}

export interface ManagerRevokedPayload extends AuditCommonPayload {
    priorRole?: string | null;
}

export interface ManagerRequestCreatedPayload extends AuditCommonPayload {
    declaredRsn: string;
    source: string;
}

export interface ManagerRequestResolvedPayload extends AuditCommonPayload {
    targetSiteAccountId: string;
    declaredRsn: string;
}

export interface ConsentRequestedPayload extends AuditCommonPayload {
    declaredRsn: string;
    declaredClanName?: string | null;
    declaredClanSlug?: string | null;
}

export interface ConsentResolvedPayload extends AuditCommonPayload {
    declaredRsn: string;
    declaredClanName?: string | null;
}

export interface BrandingUpdatedPayload extends AuditCommonPayload, BeforeAfter<BrandingState> {}

export type BrandingCustomization = { ext: string; transform: CustomizeTransform } | { cleared: true };

export interface BrandingCustomizedPayload extends AuditCommonPayload {
    customized: BrandingCustomization;
}

export interface WhitelistAddedPayload extends AuditCommonPayload {
    kind: string;
    value: string;
    label: string | null;
}

export interface WhitelistRemovedPayload extends AuditCommonPayload {
    kind?: string | null;
    value?: string | null;
}

export interface ReadAuditPayload extends AuditCommonPayload {
    count: number;
    cursor?: { before?: number; limit?: number; kindPrefix?: string };
}

export interface AuthRejectedPayload extends AuditCommonPayload {
    endpoint: string;
    method: string;
    reason: string;
}

export interface ClaimRejectedPayload extends AuditCommonPayload {
    declaredRsn?: string;
    declaredClanName?: string;
    reason: string;
}

export interface ClientClickPayload extends AuditCommonPayload {
    count?: number;
    label?: string;
}

export interface ClientSubmitPayload extends AuditCommonPayload {
    fields: string[];
    rsn?: string;
    label?: string;
    count?: number;
}

export interface ClientRoutePayload extends AuditCommonPayload {
    count?: number;
}

export interface DiscordChannelState {
    name: string;
    topic?: string | null;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    parentId?: string | null;
}

export interface DiscordAuditPayloadBase extends AuditCommonPayload {
    guildId: string;
    targetName: string;
}

export interface DiscordChannelsCreatePayload extends DiscordAuditPayloadBase {
    channelType: number;
    parentId?: string | null;
    topic?: string | null;
    nsfw?: boolean;
    rateLimitPerUser?: number;
}

export interface DiscordChannelsUpdatePayload extends DiscordAuditPayloadBase, BeforeAfter<DiscordChannelState> {}

export interface DiscordChannelsDeletePayload extends DiscordAuditPayloadBase {
    channelType: number;
}

export interface DiscordChannelsMovePayload extends DiscordAuditPayloadBase {
    beforePosition: number;
    afterPosition: number;
    beforeParentId?: string | null;
    afterParentId?: string | null;
}

export interface DiscordChannelsSetPermissionsPayload extends DiscordAuditPayloadBase {
    overwriteKind: "role" | "member";
    overwriteTargetId: string;
    overwriteTargetName: string;
    allow: string;
    deny: string;
}

export interface DiscordRoleState {
    name: string;
    color: number;
    hoist?: boolean;
    mentionable?: boolean;
    permissions: string;
}

export interface DiscordRolesCreatePayload extends DiscordAuditPayloadBase {
    color: number;
    hoist?: boolean;
    mentionable?: boolean;
    permissions: string;
}

export interface DiscordRolesUpdatePayload extends DiscordAuditPayloadBase, BeforeAfter<DiscordRoleState> {}

export interface DiscordRolesDeletePayload extends DiscordAuditPayloadBase {}

export interface DiscordRolesSetPositionPayload extends DiscordAuditPayloadBase {
    beforePosition: number;
    afterPosition: number;
}

export interface DiscordRolesSetPermissionsPayload extends DiscordAuditPayloadBase {
    beforePermissions: string;
    afterPermissions: string;
}

export interface VaultAuditPayloadBase extends AuditCommonPayload {
    entry_key: string;
    component?: string;
}

export interface VaultDiscordBotReadPayload extends VaultAuditPayloadBase {
    hit?: boolean;
    reason?: string;
}

export interface VaultDiscordBotWritePayload extends VaultAuditPayloadBase {
    entry_type?: string;
    reason?: string;
}

export interface VaultDiscordBotDeletePayload extends VaultAuditPayloadBase {}

export interface VaultDiscordBotVerifyPayload extends VaultAuditPayloadBase {
    status?: string;
}

export interface DiscordBotLinkerReassignedPayload extends AuditCommonPayload {
    previous_linker: string;
    new_linker: string;
    by_owner: string;
}

export interface DiscordMemberAuditPayloadBase extends AuditCommonPayload {
    guildId: string;
    userId: string;
    userName: string;
}

export interface DiscordMembersSetNicknamePayload extends DiscordMemberAuditPayloadBase {
    beforeNickname: string | null;
    afterNickname: string | null;
}

export interface DiscordMembersAddRolePayload extends DiscordMemberAuditPayloadBase {
    roleId: string;
    roleName: string;
}

export interface DiscordMembersRemoveRolePayload extends DiscordMemberAuditPayloadBase {
    roleId: string;
    roleName: string;
}

export interface DiscordMembersTimeoutPayload extends DiscordMemberAuditPayloadBase {
    beforeCommunicationDisabledUntil: number | null;
    afterCommunicationDisabledUntil: number | null;
    reason?: string;
}

export interface DiscordMembersKickPayload extends DiscordMemberAuditPayloadBase {
    reason?: string;
}

export interface DiscordMembersBanPayload extends DiscordMemberAuditPayloadBase {
    reason?: string;
    deleteMessageDays?: number;
}

export interface DiscordMembersUnbanPayload extends DiscordMemberAuditPayloadBase {
    reason?: string;
}

export interface DiscordWebhookState {
    name: string | null;
    channelId: string;
    avatarUrl?: string | null;
}

export interface DiscordWebhooksCreatePayload extends DiscordAuditPayloadBase {
    channelId: string;
    webhookType: number;
}

export interface DiscordWebhooksUpdatePayload extends DiscordAuditPayloadBase, BeforeAfter<DiscordWebhookState> {}

export interface DiscordWebhooksDeletePayload extends DiscordAuditPayloadBase {
    channelId: string;
}

export interface DiscordWebhooksRegenerateTokenPayload extends DiscordAuditPayloadBase {
    channelId: string;
}

export interface DiscordServerEmojisCreatePayload extends DiscordAuditPayloadBase {
    animated: boolean;
}

export interface DiscordServerEmojisRenamePayload extends DiscordAuditPayloadBase {
    beforeName: string;
    afterName: string;
}

export interface DiscordServerEmojisDeletePayload extends DiscordAuditPayloadBase {}

export interface DiscordServerStickersCreatePayload extends DiscordAuditPayloadBase {
    formatType: number;
    description?: string | null;
    tags?: string | null;
}

export interface DiscordServerStickersRenamePayload extends DiscordAuditPayloadBase {
    beforeName: string;
    afterName: string;
}

export interface DiscordServerStickersDeletePayload extends DiscordAuditPayloadBase {}

export interface DiscordGuildSettingsSetNamePayload extends DiscordAuditPayloadBase {
    beforeName: string;
    afterName: string;
}

export interface DiscordGuildSettingsSetIconPayload extends DiscordAuditPayloadBase {
    beforeIconUrl: string | null;
    afterIconUrl: string | null;
}

export interface DiscordGuildSettingsSetBannerPayload extends DiscordAuditPayloadBase {
    beforeBannerUrl: string | null;
    afterBannerUrl: string | null;
}

export interface DiscordGuildSettingsSetDescriptionPayload extends DiscordAuditPayloadBase {
    beforeDescription: string | null;
    afterDescription: string | null;
}

export interface DiscordGuildSettingsSetSystemChannelPayload extends DiscordAuditPayloadBase {
    beforeChannelId: string | null;
    afterChannelId: string | null;
}

export interface DiscordGuildSettingsSetAfkPayload extends DiscordAuditPayloadBase {
    beforeAfkChannelId: string | null;
    afterAfkChannelId: string | null;
    beforeAfkTimeout: number | null;
    afterAfkTimeout: number | null;
}

export interface DiscordGuildSettingsSetWelcomeScreenPayload extends DiscordAuditPayloadBase {
    enabled: boolean;
    description?: string | null;
}

export interface DiscordGuildSettingsSetVerificationLevelPayload extends DiscordAuditPayloadBase {
    beforeLevel: number;
    afterLevel: number;
}

export interface DiscordChannelsDeletePermissionsPayload extends DiscordAuditPayloadBase {
    overwriteKind: "role" | "member";
    overwriteTargetId: string;
    overwriteTargetName: string;
}
