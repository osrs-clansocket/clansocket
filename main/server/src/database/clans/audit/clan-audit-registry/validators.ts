import { ClanAuditActions } from "../clan-audit-actions.js";
import { ReadActions } from "./action-registry.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(v: unknown): v is string {
    return typeof v === "string";
}

function isNumber(v: unknown): v is number {
    return typeof v === "number" && Number.isFinite(v);
}

function isStringOrNull(v: unknown): v is string | null {
    return v === null || typeof v === "string";
}

type PayloadValidator = (payload: Record<string, unknown>) => boolean;

const FIELD_DECLARED_RSN = "declaredRsn";
const alwaysTrue: PayloadValidator = () => true;
const requireStrings =
    (...fields: readonly string[]): PayloadValidator =>
    (p) =>
        fields.every((f) => isString(p[f]));
const requireCount: PayloadValidator = (p) => isNumber(p.count);
const requireDeclaredRsn = requireStrings(FIELD_DECLARED_RSN);
const requireRequestResolved = requireStrings("targetSiteAccountId", FIELD_DECLARED_RSN);
const requireVaultEntryKey = requireStrings("entry_key");

const PAYLOAD_VALIDATORS: Record<string, PayloadValidator> = {
    [ClanAuditActions.RosterChanged]: (p) =>
        isNumber(p.memberCount) &&
        isNumber(p.diffCount) &&
        isStringOrNull(p.fromFingerprint) &&
        isString(p.capturedByAccountHash),
    [ClanAuditActions.ClaimCompleted]: requireStrings("displayName", "slug"),
    [ClanAuditActions.ClaimTransferred]: (p) =>
        isString(p.newOwnerSiteAccountId) && isStringOrNull(p.previousOwnerSiteAccountId),
    [ClanAuditActions.ClaimConsentRequested]: requireDeclaredRsn,
    [ClanAuditActions.ClaimConsentConfirmed]: requireDeclaredRsn,
    [ClanAuditActions.ClaimConsentRejected]: requireDeclaredRsn,
    [ClanAuditActions.ManagerGranted]: requireStrings("role", "grantedVia"),
    [ClanAuditActions.ManagerRevoked]: alwaysTrue,
    [ClanAuditActions.ManagerRequestCreated]: requireStrings(FIELD_DECLARED_RSN, "source"),
    [ClanAuditActions.ManagerRequestApproved]: requireRequestResolved,
    [ClanAuditActions.ManagerRequestDenied]: requireRequestResolved,
    [ClanAuditActions.BrandingUpdated]: (p) => isPlainObject(p.after) && (p.before === null || isPlainObject(p.before)),
    [ClanAuditActions.BrandingCustomized]: (p) => isPlainObject(p.customized),
    [ClanAuditActions.WhitelistAdded]: requireStrings("kind", "value"),
    [ClanAuditActions.WhitelistRemoved]: alwaysTrue,
    [ReadActions.ReadManagers]: requireCount,
    [ReadActions.ReadManagerRequests]: requireCount,
    [ReadActions.ReadAuditLog]: requireCount,
    [ReadActions.ReadRosterDiffs]: requireCount,
    [ReadActions.ReadWhitelist]: requireCount,
    "client:click": alwaysTrue,
    "client:submit": alwaysTrue,
    "client:route": alwaysTrue,
    [ClanAuditActions.AuthRejected]: requireStrings("endpoint", "method", "reason"),
    [ClanAuditActions.ClaimRejected]: requireStrings("reason"),
    [ClanAuditActions.DiscordChannelsCreate]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.channelType),
    [ClanAuditActions.DiscordChannelsUpdate]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        isPlainObject(p.after) &&
        (p.before === null || isPlainObject(p.before)),
    [ClanAuditActions.DiscordChannelsDelete]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.channelType),
    [ClanAuditActions.DiscordChannelsMove]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.beforePosition) && isNumber(p.afterPosition),
    [ClanAuditActions.DiscordChannelsSetPermissions]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        (p.overwriteKind === "role" || p.overwriteKind === "member") &&
        isString(p.overwriteTargetId) &&
        isString(p.overwriteTargetName) &&
        isString(p.allow) &&
        isString(p.deny),
    [ClanAuditActions.DiscordRolesCreate]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.color) && isString(p.permissions),
    [ClanAuditActions.DiscordRolesUpdate]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        isPlainObject(p.after) &&
        (p.before === null || isPlainObject(p.before)),
    [ClanAuditActions.DiscordRolesDelete]: (p) => isString(p.guildId) && isString(p.targetName),
    [ClanAuditActions.DiscordRolesSetPosition]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.beforePosition) && isNumber(p.afterPosition),
    [ClanAuditActions.DiscordRolesSetPermissions]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.beforePermissions) && isString(p.afterPermissions),
    [ClanAuditActions.VaultDiscordBotRead]: requireVaultEntryKey,
    [ClanAuditActions.VaultDiscordBotWrite]: requireVaultEntryKey,
    [ClanAuditActions.VaultDiscordBotDelete]: requireVaultEntryKey,
    [ClanAuditActions.VaultDiscordBotVerify]: requireVaultEntryKey,
    [ClanAuditActions.DiscordBotLinkerReassigned]: requireStrings("previous_linker", "new_linker", "by_owner"),
    [ClanAuditActions.DiscordMembersSetNickname]: requireStrings("guildId", "userId", "userName"),
    [ClanAuditActions.DiscordMembersAddRole]: (p) =>
        isString(p.guildId) && isString(p.userId) && isString(p.userName) && isString(p.roleId) && isString(p.roleName),
    [ClanAuditActions.DiscordMembersRemoveRole]: (p) =>
        isString(p.guildId) && isString(p.userId) && isString(p.userName) && isString(p.roleId) && isString(p.roleName),
    [ClanAuditActions.DiscordMembersTimeout]: requireStrings("guildId", "userId", "userName"),
    [ClanAuditActions.DiscordMembersKick]: requireStrings("guildId", "userId", "userName"),
    [ClanAuditActions.DiscordMembersBan]: requireStrings("guildId", "userId", "userName"),
    [ClanAuditActions.DiscordMembersUnban]: requireStrings("guildId", "userId", "userName"),
    [ClanAuditActions.DiscordWebhooksCreate]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.channelId) && isNumber(p.webhookType),
    [ClanAuditActions.DiscordWebhooksUpdate]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        isPlainObject(p.after) &&
        (p.before === null || isPlainObject(p.before)),
    [ClanAuditActions.DiscordWebhooksDelete]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.channelId),
    [ClanAuditActions.DiscordWebhooksRegenerateToken]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.channelId),
    [ClanAuditActions.DiscordServerEmojisCreate]: (p) =>
        isString(p.guildId) && isString(p.targetName) && typeof p.animated === "boolean",
    [ClanAuditActions.DiscordServerEmojisRename]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.beforeName) && isString(p.afterName),
    [ClanAuditActions.DiscordServerEmojisDelete]: requireStrings("guildId", "targetName"),
    [ClanAuditActions.DiscordServerStickersCreate]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.formatType),
    [ClanAuditActions.DiscordServerStickersRename]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.beforeName) && isString(p.afterName),
    [ClanAuditActions.DiscordServerStickersDelete]: requireStrings("guildId", "targetName"),
    [ClanAuditActions.DiscordGuildSettingsSetName]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isString(p.beforeName) && isString(p.afterName),
    [ClanAuditActions.DiscordGuildSettingsSetIcon]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isStringOrNull(p.beforeIconUrl) && isStringOrNull(p.afterIconUrl),
    [ClanAuditActions.DiscordGuildSettingsSetBanner]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isStringOrNull(p.beforeBannerUrl) && isStringOrNull(p.afterBannerUrl),
    [ClanAuditActions.DiscordGuildSettingsSetDescription]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        isStringOrNull(p.beforeDescription) &&
        isStringOrNull(p.afterDescription),
    [ClanAuditActions.DiscordGuildSettingsSetSystemChannel]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        isStringOrNull(p.beforeChannelId) &&
        isStringOrNull(p.afterChannelId),
    [ClanAuditActions.DiscordGuildSettingsSetAfk]: (p) =>
        isString(p.guildId) && isString(p.targetName),
    [ClanAuditActions.DiscordGuildSettingsSetWelcomeScreen]: (p) =>
        isString(p.guildId) && isString(p.targetName) && typeof p.enabled === "boolean",
    [ClanAuditActions.DiscordGuildSettingsSetVerificationLevel]: (p) =>
        isString(p.guildId) && isString(p.targetName) && isNumber(p.beforeLevel) && isNumber(p.afterLevel),
    [ClanAuditActions.DiscordChannelsDeletePermissions]: (p) =>
        isString(p.guildId) &&
        isString(p.targetName) &&
        (p.overwriteKind === "role" || p.overwriteKind === "member") &&
        isString(p.overwriteTargetId) &&
        isString(p.overwriteTargetName),
};

export function validatePayload(action: string, payload: unknown): boolean {
    if (!isPlainObject(payload)) return false;
    const validator = PAYLOAD_VALIDATORS[action];
    if (!validator) return true;
    return validator(payload);
}
