import {
    checkClanManagerStatus,
    fetchClanSeo,
    fetchManageClanSeo,
    getClan,
    listClanTitles,
    listManaged,
    removeClan,
    searchClans,
    updateClanSeo,
} from "./clan.js";
import { clearClanIconCustomization, customizeClanIcon, updateClanBranding, uploadClanIcon } from "./branding.js";
import {
    listClanAudit,
    listRosterDiffs,
    openClanAuditStream,
    revertClanAuditEntry,
    verifyClanAuditChain,
} from "./audit.js";
import {
    approveManagerRequest,
    createClaim,
    denyManagerRequest,
    listClanManagers,
    listManagerRequests,
    requestManagement,
    requestTransfer,
} from "./people/index.js";
import { addWhitelistRank, listWhitelist, revokeWhitelistEntry } from "./whitelist.js";

export const clansClient = {
    listManaged,
    getClan,
    fetchClanSeo,
    fetchManageClanSeo,
    updateClanSeo,
    checkClanManagerStatus,
    searchClans,
    listClanTitles,
    removeClan,
    updateClanBranding,
    uploadClanIcon,
    customizeClanIcon,
    clearClanIconCustomization,
    listClanAudit,
    listRosterDiffs,
    verifyClanAuditChain,
    revertClanAuditEntry,
    openClanAuditStream,
    createClaim,
    requestTransfer,
    requestManagement,
    listManagerRequests,
    approveManagerRequest,
    denyManagerRequest,
    listClanManagers,
    listWhitelist,
    addWhitelistRank,
    revokeWhitelistEntry,
};

export type { ClanIconKind, IconTransform, BrandingUpdate, UploadResult, CustomizeResult } from "./branding.js";
export type {
    ManagedClan,
    ManageClanSeo,
    ManageClanSeoPatch,
    ClanRosterMember,
    ClanSummary,
    ClanSearchHit,
    ManagerStatus,
    ClanTitleLadderEntry,
} from "./clan.js";
export type {
    ClanAuditEntry,
    AuditPage,
    AuditListOptions,
    ClanRosterDiff,
    AuditVerifyResult,
    AuditRevertResult,
} from "./audit.js";
export type {
    ClaimSubmitResult,
    ManagerSubmitResult,
    ManagerRequestSource,
    ManagerRequest,
    ClanManagerRow,
} from "./people/index.js";
export type { WhitelistKind, WhitelistEntry } from "./whitelist.js";
