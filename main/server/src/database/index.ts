export {
    initializeDatabase,
    closeDatabase,
    isDatabaseReady,
    getDb,
    getPluginDb,
    getStaticDb,
    getClanDb,
    getClanPluginDb,
    getDiscordGuildDb,
    listOpenPluginModes,
    listClanPluginModes,
    clanDirRelPath,
    DB_NAMES,
    STATIC_DB_NAMES,
    PLUGIN_DB_PREFIX,
} from "./core/database.js";
export { placeholdersFor } from "./core/db-helpers.js";
export {
    slugify,
    provisionClan,
    findClanByDisplayName,
    getClanById,
    getClanBySlug,
    resolveOrCreateClan,
    countClans,
} from "./clans/clan-app-helpers.js";
export type { ClanRow, ClanStatus, ProvisionClanArgs } from "./clans/clan-app-helpers.js";
export {
    recordClanRoster,
    isMemberInClanRoster,
    getRosterRank,
    getRosterPluginPresence,
    listRosterDiffsForFingerprint,
} from "./clans/access/clan-roster-helpers/index.js";
export type { ClanRosterMember, PluginPresence, ClanRosterDiff } from "./clans/access/clan-roster-helpers/index.js";
export { listClanAuditEntries } from "./clans/audit/clan-audit-helpers/list/index.js";
export { recordClanAudit } from "./clans/audit/clan-audit-helpers/record.js";
export { pruneOldClanAuditEntries, anonymizeClanAuditActor } from "./clans/audit/clan-audit-helpers/retention.js";
export { ingestClientAuditBatch } from "./clans/audit/clan-audit-helpers/ingest.js";
export { verifyClanAuditChain } from "./clans/audit/clan-audit-helpers/verify.js";
export { isRevertable, revertAuditEntry, REVERTABLE_ACTIONS } from "./clans/audit/clan-audit-revert/index.js";
export type { RevertResult } from "./clans/audit/clan-audit-revert/index.js";
export { broadcastClanAuditEntry, subscribeClanAuditStream } from "./clans/audit/clan-audit-stream.js";
export type { AuditStreamHandler } from "./clans/audit/clan-audit-stream.js";
export type {
    ClanAuditEntry,
    ListClanAuditOptions,
    ListClanAuditResult,
} from "./clans/audit/clan-audit-helpers/list/index.js";
export type { RecordClanAuditEntry } from "./clans/audit/clan-audit-helpers/record.js";
export type { ClientAuditEntry, IngestResult } from "./clans/audit/clan-audit-helpers/ingest.js";
export type { VerifyResult } from "./clans/audit/clan-audit-helpers/verify.js";
export { ClanAuditActions, ClanAuditTargetTypes } from "./clans/audit/clan-audit-actions.js";
export type { ClanAuditAction, ClanAuditTargetType } from "./clans/audit/clan-audit-actions.js";
export {
    upsertSiteAccount,
    getSiteAccountById,
    bindSiteAccountAccountHash,
    listAccountHashesForSiteAccount,
    findSiteAccountByAccountHash,
    revokeAccountHashBinding,
} from "./site/site-account-helpers/index.js";
export type { SiteAccountRow, SiteAccountProvider, SiteAccountUpsertArgs } from "./site/site-account-helpers/index.js";
export { finalizeClanClaim, ClanClaimError } from "./clans/access/clan-claim-helpers.js";
export type { FinalizeClaimArgs } from "./clans/access/clan-claim-helpers.js";
export {
    addClanWhitelistRank,
    listClanWhitelist,
    revokeClanWhitelistEntry,
    isRankWhitelistedForClan,
} from "./clans/access/clan-whitelist-helpers.js";
export type { ClanWhitelistRow, ClanWhitelistKind } from "./clans/access/clan-whitelist-helpers.js";
export {
    insertClanManager,
    isClanManager,
    listClanManagersForAccount,
    listManagersForClan,
    revokeClanManager,
} from "./clans/access/clan-manager-helpers.js";
export { resolveClanPosture, resolveLiveClanPosture } from "./clans/access/clan-access-helpers.js";
export type { ClanPosture } from "./clans/access/clan-access-helpers.js";
export type { ClanManagerRow, ClanManagerRole, ClanManagerGrantedVia } from "./clans/access/clan-manager-helpers.js";
export {
    createManagerRequest,
    getManagerRequestById,
    listPendingRequestsForClan,
    resolveManagerRequest,
} from "./clans/access/clan-manager-request-helpers.js";
export type {
    ManagerRequestRow,
    ManagerRequestSource,
    ManagerRequestStatus,
    CreateRequestArgs,
} from "./clans/access/clan-manager-request-helpers.js";
export { insert, insertIgnore, select, deleteRows, transaction } from "./core/operations.js";
export {
    recordPluginDisconnect,
    recordPluginIdentity,
    recordPluginLoginState,
    touchPluginCurrentState,
} from "./plugin/helpers/identity/index.js";
export { recordPluginClanChat } from "./plugin/helpers/chat.js";
export { upsertPluginCombatAchievementCatalog } from "./plugin/helpers/combat-achievements/index.js";
export {
    markPluginConnected,
    markPluginDisconnected,
    recordPluginPingPong,
    getPluginMetrics,
    getClanPluginMetrics,
} from "./plugin/helpers/observability.js";
export { listClanTitleLadder, recordPluginClanTitlesSnapshot } from "./plugin/helpers/clan-titles.js";
export { routePluginEvent } from "./plugin/projection/router.js";
export type { PluginIdentityRecord } from "./plugin/helpers/identity/index.js";
export type { PluginClanChatRecord } from "./plugin/helpers/chat.js";
export type { PluginCombatAchievementCatalogEntry } from "./plugin/helpers/combat-achievements/index.js";
export type { PluginMetrics } from "./plugin/helpers/observability.js";
export type {
    ClanTitleLadderEntry,
    PluginClanTitleEntry,
    PluginClanTitlesSnapshotRecord,
} from "./plugin/helpers/clan-titles.js";
export {
    RSN_VERIFY_TTL_MS,
    CLAIM_CONSENT_TTL_MS,
    RSN_DISPLACED_CLEANUP_MS,
    RSN_DISPLACED_PLACEHOLDER_LEN,
    RSN_MAX_LEN,
    findRsnHolder,
    getAccountRsn,
    listRsnsForSiteAccount,
    placeholderFromHash,
} from "./site/rsn/state.js";
export { upsertVerifiedRsn } from "./site/rsn/upsert.js";
export { listDisplacedReadyForPurge, rsnSeenInPluginHistory } from "./site/rsn/lookup.js";
export { createConsentRequest } from "./site/consent/create.js";
export {
    findPendingConsentsForAccountHash,
    findPendingConsentsForRsn,
    findPendingConsentsForSiteAccount,
    findAllConsentsForSiteAccount,
    findConsentRequestById,
} from "./site/consent/query.js";
export { expirePendingConsents, cancelConsentRequest, resolveConsentRequest } from "./site/consent/mutate.js";
export type { RsnSource, AccountRsnRow, SiteAccountRsnRow, DisplacedSiteAccount } from "./site/rsn/state.js";
export type { ConsentKind, ConsentStatus, ConsentRequestRow, CreateConsentArgs } from "./site/consent/types.js";
