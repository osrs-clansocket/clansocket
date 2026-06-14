import { logout, session, startDiscordLink, startDiscordLogin, startGithubLink, startGithubLogin } from "./auth.js";
import { authedFetch } from "./fetch-helpers.js";
import {
    cancelRsnRequest,
    getIdentification,
    openIdentificationStream,
    removeRsnBinding,
    requestRsn,
} from "./identification.js";
import { listProviders, unlinkProvider, updateDisplayName } from "./provider-mgmt.js";

export type {
    Identification,
    LinkedProvider,
    PendingClaimConsent,
    PendingRsnRequest,
    SiteAccount,
    VerifiedRsn,
} from "./types.js";
export { DISPLAY_NAME_MAX_LEN, RSN_MAX_LEN } from "./types.js";
export { setCausalCorrelationId } from "./fetch-helpers.js";
export { loginUrls } from "./auth.js";

export const identityClient = {
    session,
    logout,
    authedFetch,
    startGithubLogin,
    startDiscordLogin,
    startGithubLink,
    startDiscordLink,
    updateDisplayName,
    listProviders,
    unlinkProvider,
    getIdentification,
    requestRsn,
    cancelRsnRequest,
    removeRsnBinding,
    openIdentificationStream,
};
