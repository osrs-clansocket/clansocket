import { ClanAuditActions, type ClanAuditTargetType } from "../clan-audit-actions.js";
import type {
    AuditSource,
    AuthRejectedPayload,
    BrandingCustomizedPayload,
    BrandingUpdatedPayload,
    ClaimCompletedPayload,
    ClaimRejectedPayload,
    ClaimTransferredPayload,
    ClientClickPayload,
    ClientRoutePayload,
    ClientSubmitPayload,
    ConsentRequestedPayload,
    ConsentResolvedPayload,
    DiscordBotLinkerReassignedPayload,
    DiscordChannelsCreatePayload,
    DiscordChannelsDeletePayload,
    DiscordChannelsMovePayload,
    DiscordChannelsSetPermissionsPayload,
    DiscordChannelsUpdatePayload,
    DiscordMembersAddRolePayload,
    DiscordMembersBanPayload,
    DiscordMembersKickPayload,
    DiscordMembersRemoveRolePayload,
    DiscordMembersSetNicknamePayload,
    DiscordMembersTimeoutPayload,
    DiscordMembersUnbanPayload,
    DiscordRolesCreatePayload,
    DiscordRolesDeletePayload,
    DiscordRolesSetPermissionsPayload,
    DiscordRolesSetPositionPayload,
    DiscordRolesUpdatePayload,
    DiscordWebhooksCreatePayload,
    DiscordWebhooksDeletePayload,
    DiscordWebhooksRegenerateTokenPayload,
    DiscordWebhooksUpdatePayload,
    DiscordServerEmojisCreatePayload,
    DiscordServerEmojisDeletePayload,
    DiscordServerEmojisRenamePayload,
    DiscordServerStickersCreatePayload,
    DiscordServerStickersDeletePayload,
    DiscordServerStickersRenamePayload,
    DiscordGuildSettingsSetAfkPayload,
    DiscordGuildSettingsSetBannerPayload,
    DiscordGuildSettingsSetDescriptionPayload,
    DiscordGuildSettingsSetIconPayload,
    DiscordGuildSettingsSetNamePayload,
    DiscordGuildSettingsSetSystemChannelPayload,
    DiscordGuildSettingsSetVerificationLevelPayload,
    DiscordGuildSettingsSetWelcomeScreenPayload,
    DiscordChannelsDeletePermissionsPayload,
    DiscordAutoHookCreatedPayload,
    DiscordAutoHookUpdatedPayload,
    DiscordAutoHookDeletedPayload,
    DiscordAutoHookToggledPayload,
    DiscordWebhookTokenRevokedPayload,
    ManagerGrantedPayload,
    ManagerRequestCreatedPayload,
    ManagerRequestResolvedPayload,
    ManagerRevokedPayload,
    ReadAuditPayload,
    RosterChangedPayload,
    SeoUpdatedPayload,
    VaultDiscordBotDeletePayload,
    VaultDiscordBotReadPayload,
    VaultDiscordBotVerifyPayload,
    VaultDiscordBotWritePayload,
    VaultWomDeletePayload,
    VaultWomReadPayload,
    VaultWomVerifyPayload,
    VaultWomWritePayload,
    WhitelistAddedPayload,
    WhitelistRemovedPayload,
    WomBackfillCompletedPayload,
    WomBackfillFailedPayload,
    WomLinkLinkerReassignedPayload,
    WomRsnChangedPayload,
} from "./payload-types.js";

type TypedAction =
    | { action: typeof ClanAuditActions.RosterChanged; payload: RosterChangedPayload }
    | { action: typeof ClanAuditActions.ClaimCompleted; payload: ClaimCompletedPayload }
    | { action: typeof ClanAuditActions.ClaimTransferred; payload: ClaimTransferredPayload }
    | { action: typeof ClanAuditActions.ClaimConsentRequested; payload: ConsentRequestedPayload }
    | { action: typeof ClanAuditActions.ClaimConsentConfirmed; payload: ConsentResolvedPayload }
    | { action: typeof ClanAuditActions.ClaimConsentRejected; payload: ConsentResolvedPayload }
    | { action: typeof ClanAuditActions.ManagerGranted; payload: ManagerGrantedPayload }
    | { action: typeof ClanAuditActions.ManagerRevoked; payload: ManagerRevokedPayload }
    | { action: typeof ClanAuditActions.ManagerRequestCreated; payload: ManagerRequestCreatedPayload }
    | { action: typeof ClanAuditActions.ManagerRequestApproved; payload: ManagerRequestResolvedPayload }
    | { action: typeof ClanAuditActions.ManagerRequestDenied; payload: ManagerRequestResolvedPayload }
    | { action: typeof ClanAuditActions.BrandingUpdated; payload: BrandingUpdatedPayload }
    | { action: typeof ClanAuditActions.BrandingCustomized; payload: BrandingCustomizedPayload }
    | { action: typeof ClanAuditActions.SeoUpdated; payload: SeoUpdatedPayload }
    | { action: typeof ClanAuditActions.WhitelistAdded; payload: WhitelistAddedPayload }
    | { action: typeof ClanAuditActions.WhitelistRemoved; payload: WhitelistRemovedPayload }
    | { action: "server:read.managers"; payload: ReadAuditPayload }
    | { action: "server:read.manager_requests"; payload: ReadAuditPayload }
    | { action: "server:read.audit_log"; payload: ReadAuditPayload }
    | { action: "server:read.roster_diffs"; payload: ReadAuditPayload }
    | { action: "server:read.whitelist"; payload: ReadAuditPayload }
    | { action: "client:click"; payload: ClientClickPayload }
    | { action: "client:submit"; payload: ClientSubmitPayload }
    | { action: "client:route"; payload: ClientRoutePayload }
    | { action: typeof ClanAuditActions.AuthRejected; payload: AuthRejectedPayload }
    | { action: typeof ClanAuditActions.ClaimRejected; payload: ClaimRejectedPayload }
    | { action: typeof ClanAuditActions.DiscordChannelsCreate; payload: DiscordChannelsCreatePayload }
    | { action: typeof ClanAuditActions.DiscordChannelsUpdate; payload: DiscordChannelsUpdatePayload }
    | { action: typeof ClanAuditActions.DiscordChannelsDelete; payload: DiscordChannelsDeletePayload }
    | { action: typeof ClanAuditActions.DiscordChannelsMove; payload: DiscordChannelsMovePayload }
    | { action: typeof ClanAuditActions.DiscordChannelsSetPermissions; payload: DiscordChannelsSetPermissionsPayload }
    | { action: typeof ClanAuditActions.DiscordRolesCreate; payload: DiscordRolesCreatePayload }
    | { action: typeof ClanAuditActions.DiscordRolesUpdate; payload: DiscordRolesUpdatePayload }
    | { action: typeof ClanAuditActions.DiscordRolesDelete; payload: DiscordRolesDeletePayload }
    | { action: typeof ClanAuditActions.DiscordRolesSetPosition; payload: DiscordRolesSetPositionPayload }
    | { action: typeof ClanAuditActions.DiscordRolesSetPermissions; payload: DiscordRolesSetPermissionsPayload }
    | { action: typeof ClanAuditActions.VaultDiscordBotRead; payload: VaultDiscordBotReadPayload }
    | { action: typeof ClanAuditActions.VaultDiscordBotWrite; payload: VaultDiscordBotWritePayload }
    | { action: typeof ClanAuditActions.VaultDiscordBotDelete; payload: VaultDiscordBotDeletePayload }
    | { action: typeof ClanAuditActions.VaultDiscordBotVerify; payload: VaultDiscordBotVerifyPayload }
    | { action: typeof ClanAuditActions.DiscordBotLinkerReassigned; payload: DiscordBotLinkerReassignedPayload }
    | { action: typeof ClanAuditActions.DiscordMembersSetNickname; payload: DiscordMembersSetNicknamePayload }
    | { action: typeof ClanAuditActions.DiscordMembersAddRole; payload: DiscordMembersAddRolePayload }
    | { action: typeof ClanAuditActions.DiscordMembersRemoveRole; payload: DiscordMembersRemoveRolePayload }
    | { action: typeof ClanAuditActions.DiscordMembersTimeout; payload: DiscordMembersTimeoutPayload }
    | { action: typeof ClanAuditActions.DiscordMembersKick; payload: DiscordMembersKickPayload }
    | { action: typeof ClanAuditActions.DiscordMembersBan; payload: DiscordMembersBanPayload }
    | { action: typeof ClanAuditActions.DiscordMembersUnban; payload: DiscordMembersUnbanPayload }
    | { action: typeof ClanAuditActions.DiscordWebhooksCreate; payload: DiscordWebhooksCreatePayload }
    | { action: typeof ClanAuditActions.DiscordWebhooksUpdate; payload: DiscordWebhooksUpdatePayload }
    | { action: typeof ClanAuditActions.DiscordWebhooksDelete; payload: DiscordWebhooksDeletePayload }
    | { action: typeof ClanAuditActions.DiscordWebhooksRegenerateToken; payload: DiscordWebhooksRegenerateTokenPayload }
    | { action: typeof ClanAuditActions.DiscordServerEmojisCreate; payload: DiscordServerEmojisCreatePayload }
    | { action: typeof ClanAuditActions.DiscordServerEmojisRename; payload: DiscordServerEmojisRenamePayload }
    | { action: typeof ClanAuditActions.DiscordServerEmojisDelete; payload: DiscordServerEmojisDeletePayload }
    | { action: typeof ClanAuditActions.DiscordServerStickersCreate; payload: DiscordServerStickersCreatePayload }
    | { action: typeof ClanAuditActions.DiscordServerStickersRename; payload: DiscordServerStickersRenamePayload }
    | { action: typeof ClanAuditActions.DiscordServerStickersDelete; payload: DiscordServerStickersDeletePayload }
    | { action: typeof ClanAuditActions.DiscordGuildSettingsSetName; payload: DiscordGuildSettingsSetNamePayload }
    | { action: typeof ClanAuditActions.DiscordGuildSettingsSetIcon; payload: DiscordGuildSettingsSetIconPayload }
    | { action: typeof ClanAuditActions.DiscordGuildSettingsSetBanner; payload: DiscordGuildSettingsSetBannerPayload }
    | {
          action: typeof ClanAuditActions.DiscordGuildSettingsSetDescription;
          payload: DiscordGuildSettingsSetDescriptionPayload;
      }
    | {
          action: typeof ClanAuditActions.DiscordGuildSettingsSetSystemChannel;
          payload: DiscordGuildSettingsSetSystemChannelPayload;
      }
    | { action: typeof ClanAuditActions.DiscordGuildSettingsSetAfk; payload: DiscordGuildSettingsSetAfkPayload }
    | {
          action: typeof ClanAuditActions.DiscordGuildSettingsSetWelcomeScreen;
          payload: DiscordGuildSettingsSetWelcomeScreenPayload;
      }
    | {
          action: typeof ClanAuditActions.DiscordGuildSettingsSetVerificationLevel;
          payload: DiscordGuildSettingsSetVerificationLevelPayload;
      }
    | {
          action: typeof ClanAuditActions.DiscordChannelsDeletePermissions;
          payload: DiscordChannelsDeletePermissionsPayload;
      }
    | { action: typeof ClanAuditActions.DiscordAutoHookCreated; payload: DiscordAutoHookCreatedPayload }
    | { action: typeof ClanAuditActions.DiscordAutoHookUpdated; payload: DiscordAutoHookUpdatedPayload }
    | { action: typeof ClanAuditActions.DiscordAutoHookDeleted; payload: DiscordAutoHookDeletedPayload }
    | { action: typeof ClanAuditActions.DiscordAutoHookToggled; payload: DiscordAutoHookToggledPayload }
    | { action: typeof ClanAuditActions.DiscordWebhookTokenRevoked; payload: DiscordWebhookTokenRevokedPayload }
    | { action: typeof ClanAuditActions.VaultWomRead; payload: VaultWomReadPayload }
    | { action: typeof ClanAuditActions.VaultWomWrite; payload: VaultWomWritePayload }
    | { action: typeof ClanAuditActions.VaultWomDelete; payload: VaultWomDeletePayload }
    | { action: typeof ClanAuditActions.VaultWomVerify; payload: VaultWomVerifyPayload }
    | { action: typeof ClanAuditActions.WomLinkLinkerReassigned; payload: WomLinkLinkerReassignedPayload }
    | { action: typeof ClanAuditActions.WomRsnChanged; payload: WomRsnChangedPayload }
    | { action: typeof ClanAuditActions.WomBackfillCompleted; payload: WomBackfillCompletedPayload }
    | { action: typeof ClanAuditActions.WomBackfillFailed; payload: WomBackfillFailedPayload };

export type AnyAuditAction = TypedAction["action"];
export type PayloadFor<A extends AnyAuditAction> = Extract<TypedAction, { action: A }>["payload"];

export interface ActionDef {
    source: AuditSource;
    schemaVersion: number;
    targetType: ClanAuditTargetType | null;
    isStateChange: boolean;
    hasBeforeAfter: boolean;
}

export function def(
    source: AuditSource,
    targetType: ClanAuditTargetType | null,
    isStateChange: boolean,
    hasBeforeAfter = false,
    schemaVersion = 1,
): ActionDef {
    return { source, targetType, isStateChange, hasBeforeAfter, schemaVersion };
}
