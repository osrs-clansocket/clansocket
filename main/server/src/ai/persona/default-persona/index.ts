import { aiCelebrationRules, aiFumbleRecovery } from "./celebration-recovery.js";
import {
    aiDeflectPhrasings,
    aiIdkForm,
    aiInsideJokes,
    aiLaneOut,
    aiName,
    aiRoleTagline,
    aiVoiceDirective,
} from "./identity.js";
import { aiPhraseBanks } from "./phrase-banks.js";
import { aiDomainPriorities, aiTopicAvoids, aiWatchedRsns } from "./preferences/domain.js";
import {
    aiAddressForm,
    aiDateFormat,
    aiMarkdownPolicy,
    aiPronouns,
    aiReactionCeiling,
    aiTimeFormat,
    aiTimeNarrationPolicy,
    aiVerbosityDefault,
} from "./preferences/engagement.js";
import {
    aiChainAutoLimit,
    aiChainAutoLimitWarnAt,
    aiClarifyThreshold,
    aiDiscoveryVerbosity,
    aiHistoryWindow,
    aiPollMaxSeconds,
    aiPollMinSeconds,
    aiQuietHours,
    aiSuggestionPolicy,
} from "./preferences/policy.js";
import { aiShittalkDoctrine } from "./shittalk-doctrine.js";
import { aiAntiVoice, aiReactionCalibration, aiSwearPolicy, aiVoiceDNA } from "./voice-rules.js";

export const personaDefaults: Record<string, string> = {
    __ai_name__: aiName,
    __ai_role_tagline__: aiRoleTagline,
    __ai_voice_directive__: aiVoiceDirective,
    __ai_lane_out__: aiLaneOut,
    __ai_deflect_phrasings__: aiDeflectPhrasings,
    __ai_idk_form__: aiIdkForm,
    __ai_phrase_banks__: aiPhraseBanks,
    __ai_shittalk_doctrine__: aiShittalkDoctrine,
    __ai_inside_jokes__: aiInsideJokes,
    __ai_voice_dna__: aiVoiceDNA,
    __ai_reaction_calibration__: aiReactionCalibration,
    __ai_anti_voice__: aiAntiVoice,
    __ai_celebration_rules__: aiCelebrationRules,
    __ai_fumble_recovery__: aiFumbleRecovery,
    __ai_swear_policy__: aiSwearPolicy,

    __ai_verbosity_default__: aiVerbosityDefault,
    __ai_markdown_policy__: aiMarkdownPolicy,
    __ai_time_narration_policy__: aiTimeNarrationPolicy,
    __ai_address_form__: aiAddressForm,
    __ai_pronouns__: aiPronouns,
    __ai_reaction_ceiling__: aiReactionCeiling,
    __ai_time_format__: aiTimeFormat,
    __ai_date_format__: aiDateFormat,

    __ai_chain_auto_limit__: aiChainAutoLimit,
    __ai_chain_auto_limit_warn_at__: aiChainAutoLimitWarnAt,
    __ai_poll_min_seconds__: aiPollMinSeconds,
    __ai_poll_max_seconds__: aiPollMaxSeconds,
    __ai_history_window__: aiHistoryWindow,
    __ai_clarify_threshold__: aiClarifyThreshold,
    __ai_suggestion_policy__: aiSuggestionPolicy,
    __ai_discovery_verbosity__: aiDiscoveryVerbosity,
    __ai_quiet_hours__: aiQuietHours,

    __ai_domain_priorities__: aiDomainPriorities,
    __ai_watched_rsns__: aiWatchedRsns,
    __ai_topic_avoids__: aiTopicAvoids,
};
