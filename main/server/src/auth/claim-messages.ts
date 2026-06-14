export const CLAIM_REASON_NO_LIVE_PLUGIN = "no-live-plugin";
export const CLAIM_REASON_NO_CLAN = "no-clan";
export const CLAIM_REASON_BAD_PAYLOAD = "bad-payload";
export const CLAIM_REASON_NOT_ACTUAL_OWNER = "not-actual-owner";
export const CLAIM_REASON_WRONG_RSN_OR_CLAN = "wrong-rsn-or-clan";
export const CLAIM_REASON_ALREADY_CLAIMED = "already-claimed";
export const CLAIM_REASON_INTERNAL = "internal";

export const CLAIM_MESSAGE_NO_LIVE_PLUGIN =
    "No live plugin session for this RSN. Log into RuneLite with the ClanSocket plugin as that RSN, then submit.";
export const CLAIM_MESSAGE_NO_CLAN = "Your plugin reports no clan for this account. Join a clan in-game and try again.";
export const CLAIM_MESSAGE_BAD_PAYLOAD = "RSN is required.";
export const CLAIM_MESSAGE_AWAITING_CONSENT =
    "A consent prompt is waiting in RuneLite's ClanSocket plugin panel — confirm it.";
export const CLAIM_MESSAGE_NOT_ACTUAL_OWNER_PREFIX = "Transfer requires Owner rank. Your current rank is ";
export const CLAIM_MESSAGE_WRONG_RSN_OR_CLAN =
    "Your plugin is logged in as a different account or clan than the one you submitted.";
export const CLAIM_MESSAGE_INTERNAL = "Operation failed unexpectedly. Try again.";

export const CLAIM_RANK_OWNER = "Owner";
export const CLAIM_RANK_DEPUTY = "Deputy Owner";
export const CLAIM_ELIGIBLE_RANKS: readonly string[] = [CLAIM_RANK_OWNER, CLAIM_RANK_DEPUTY];

export const CLAIM_REIDENTIFY_TIMEOUT_MS = 3000;
