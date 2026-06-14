import type { ModeKey } from "./types.js";
import type { Tooltip } from "../../shared/types/tooltip-types.js";

export const MODE_TOOLTIPS: Readonly<Record<ModeKey, Tooltip>> = {
    mode_continuous: {
        what: "switches the AI from one-reply mode to live-tracking — it watches state + narrates changes.",
        why: "off = AI just answers when u ask. on = AI also keeps an eye on stuff + pings u when it shifts.",
        how: "flip it. when on, cadence + quiet hours settings show up.",
    },
    mode_dashboard_actions: {
        what: "lets the AI click buttons + fill forms + route u around the dashboard.",
        why: "off = AI is read-only (narrates + answers, never executes). on = AI can drive the UI on ur behalf.",
        how: "flip it. destructive actions (delete clan, kick member) still need u to click — AI never fires those.",
    },
    mode_db_queries: {
        what: "lets the AI run SELECT queries on ur live data to answer questions.",
        why: "off = AI can only use whats already in chat context. on = AI pulls fresh data when needed.",
        how: "flip it. queries are read-only — AI cant modify ur data.",
    },
    mode_memory_authoring: {
        what: "lets the AI take long-term notes about u (recurring patterns, prefs, recipes).",
        why: "off = every conversation starts fresh. on = AI remembers things across sessions.",
        how: "flip it. memory files live in the Memory tab — u can review + delete anytime.",
    },
    mode_pin_unpin: {
        what: "lets the AI temporarily pin context (prompts + memory notes) so they stay live across turns.",
        why: "also gates auto-pinning of fresh memory notes — when off, new notes are created but not auto-pinned. usually leave on.",
        how: "flip it. minor power-user feature.",
    },
    mode_profile_updates: {
        what: "lets the AI build + update its mental model of u (who u are, what u care about).",
        why: "off = AI doesnt accumulate a profile — fresh every session. on = it learns u over time.",
        how: "flip it. profile is in the User tab — u can review + edit anytime.",
    },
    mode_suggested_replies: {
        what: "shows a 'u could say X' suggestion in the chat input after the AI replies.",
        why: "off = no suggestions appear. on = AI offers natural next-step prompts.",
        how: "flip it.",
    },
    mode_banter: {
        what: "lets the AI roast u back when u start shit.",
        why: "off = AI stays polite no matter what. on = AI engages in mutual banter (data-driven, never fabricated).",
        how: "flip it. when on, the Banter concern in Persona shows up.",
    },
    mode_inside_jokes: {
        what: "lets the AI use ur clans inside jokes naturally.",
        why: "off = AI doesnt use them. on = it weaves them into msgs without explaining.",
        how: "flip it.",
    },
    mode_spontaneous_reactions: {
        what: "lets the AI react on its own to events (drops, deaths, milestones).",
        why: "off = AI is quiet unless u talk to it. on = it celebrates + commiserates as stuff happens.",
        how: "flip it. when on, the Reactions concern in Persona shows up.",
    },
    mode_op_action: {
        what: "lets the AI run multi-step tasks (claim a clan, fill forms, navigate-then-act).",
        why: "off = AI cant chain dashboard actions. on = it handles 'claim X as Y' + similar.",
        how: "flip it. usually leave on if Dashboard actions is on.",
    },
    mode_op_guide: {
        what: "lets the AI help u find sections + explain dashboard features.",
        why: "off = AI cant navigate or highlight UI on ur behalf. on = 'where is X' works.",
        how: "flip it.",
    },
    mode_op_tracker: {
        what: "lets the AI pull player stats + leaderboards + ranks.",
        why: "off = AI doesnt fetch stat data. on = 'whats my xp/hr' works.",
        how: "flip it. needs DB queries also on.",
    },
};
