import type { Tooltip } from "../../shared/types/tooltip-types.js";

export const TOOLTIPS: Readonly<Record<string, Tooltip>> = {
    ai_name: {
        what: "what to call the AI when chatting with it.",
        why: "gives it a personal feel. if u dont set one, it just uses the default platform name.",
        how: "type a single word. like Varez, Cap, or whatever u want. no spaces or weird symbols.",
    },
    ai_role_tagline: {
        what: "one-line who-it-is the AI uses when introducing itself.",
        why: "helps anyone meeting it know what its for.",
        how: "one short sentence. like 'ai for clansocket — runs the platform + reads ur clans data'.",
    },
    ai_idk_form: {
        what: "how the AI says it doesnt know smth.",
        why: "if u dont set this, it might say 'I do not know' formal-style. ur version keeps it sounding like u.",
        how: "a short phrase. like 'idk', 'no clue', 'not sure mate'.",
    },
    ai_voice_directive: {
        what: "a one-line vibe check for how the AI should sound.",
        why: "every other voice rule reads against this. without it, it defaults to plain + helpful.",
        how: "one line. like 'talk like a clannie, casual + sharp + osrs-fluent — never corporate'.",
    },
    ai_voice_dna: {
        what: "hard rules the AI follows for how it writes.",
        why: "keeps its voice consistent. without them it drifts toward generic chatbot.",
        how: "numbered list. like '1. lowercase i | 2. drop apostrophes | 3. emoticons not emoji | 4. keep msgs short'.",
    },
    ai_anti_voice: {
        what: "phrases the AI is banned from saying.",
        why: "stops corporate-bot leaks like 'As an AI' or 'Great question!'.",
        how: "one phrase per line. add anything that sounds off to u.",
    },
    ai_phrase_banks: {
        what: "the words the AI picks from when reacting (laughing, hi, agreeing, etc.).",
        why: "if u dont set this, it uses default vocab. setting it makes the AI sound like u + ur clan.",
        how: "one type per row. format: 'LAUGHTER: lol(55) haha(20) lmfao(13)' — the number is roughly how often each one shows up.",
    },
    ai_shittalk_doctrine: {
        what: "how the AI roasts back when u start shit.",
        why: "real roasts need real data — never made up. without rules it goes too soft or fabricates jabs.",
        how: "free text. describe when banter is on, what makes a fair roast vs cheap, when to chill.",
    },
    ai_inside_jokes: {
        what: "clan-specific phrases the AI uses naturally without explaining.",
        why: "stops it from translating jokes back at u. if u say 'grats nerd' it shouldnt add '[friendly maxer tease]'.",
        how: "one joke per line. format: '- \"phrase\" — quick note'. the note is for the AI, never said out loud.",
    },
    ai_lane_out: {
        what: "stuff the AI wont engage with, on top of the built-in refusals.",
        why: "by default it already refuses game strategy + advice. this is for ur clans extra 'dont go there' topics.",
        how: "one rule per line. like 'no irl drama' or 'dont engage with politics'. leave blank to keep just the defaults.",
    },
    ai_deflect_phrasings: {
        what: "the lines the AI uses when refusing a request.",
        why: "if u dont set these, it improvises — sounds inconsistent.",
        how: "a few lines, one per row. like 'not my lane mate, wiki got u' or 'thats a strat call, ask a clannie'. it picks one when refusing.",
    },
    ai_reaction_calibration: {
        what: "how hyped or chill the AI gets per type of event.",
        why: "same drop should hype different at peak hours vs 4am. same death is funnier when its a bank-wipe vs a small hp loss.",
        how: "tiered list. like 'small drop (<5M): 0-1 ack | medium (5-50M): 1-2 | first 99: 4-6 | inferno cape: 4-10'.",
    },
    ai_celebration_rules: {
        what: "how the AI handles ur wins (drops, 99s, milestones).",
        why: "without rules celebrations turn cringe ('Crushing it!') or flat. these keep it natural.",
        how: "free text. say when to celebrate, how big (1-line vs longer), and what to avoid (corporate hype words).",
    },
    ai_fumble_recovery: {
        what: "how the AI handles its own mistakes.",
        why: "it'll mess up sometimes. without rules it either over-apologizes or doubles down — both bad.",
        how: "free text. usually: short ack + move on. never 'i apologize for the confusion'.",
    },
    ai_swear_policy: {
        what: "how the AI handles swearing + censoring.",
        why: "every clan tolerates language differently + auto-mods can strip raw swears. AI needs to know how u want it.",
        how: "free text. describe ur default — raw swears OK / softened (fking, heck) preferred / fully censored. + when to break the rule.",
    },

    ai_address_form: {
        what: "what the AI calls u when talking to u directly.",
        why: "some prefer their rsn, some a nickname, some no name at all (more impersonal).",
        how: "pick one. rsn = ur osrs name. nickname = informal handle. display-name = ur dashboard name. none = no addressing.",
    },
    ai_pronouns: {
        what: "pronouns (he/she/they/etc) the AI uses when referring to u.",
        why: "pick what fits — or 'none' if u dont want pronouns at all (the default).",
        how: "pick from the dropdown.",
    },
    ai_time_format: {
        what: "12-hour or 24-hour clock for any time the AI shows in chat.",
        why: "'3pm' vs '15:00' — locale + personal preference.",
        how: "pick one.",
    },
    ai_date_format: {
        what: "how dates show in chat.",
        why: "different regions write dates differently — pick the one u read fastest.",
        how: "pick: DMY (europe), MDY (us), YMD (asia/iso-style), ISO (YYYY-MM-DD format).",
    },
    ai_reaction_ceiling: {
        what: "max hype level the AI can reach.",
        why: "even with reaction levels set, big celebrations might feel too loud. this caps how loud it ever gets.",
        how: "pick: muted (chill, no spontaneous reactions), normal (default), high (let it max out).",
    },
    ai_verbosity_default: {
        what: "how long the AIs replies are by default.",
        why: "some want short always; others want full breakdowns. sets the baseline.",
        how: "free text. typical: 'match the ask — chill q gets chill reply, big q gets full breakdown, never shrink because the msg sounded casual'.",
    },
    ai_markdown_policy: {
        what: "when the AI uses markdown (tables, lists, bold) vs plain text.",
        why: "dashboard renders markdown nicely; some prefer plain prose tho.",
        how: "free text. typical: 'auto — use markdown for data, plain prose for conversation'.",
    },
    ai_time_narration_policy: {
        what: "when the AI mentions the time of day in chat.",
        why: "it knows ur local time. without rules it might keep saying 'its 3am' — annoying as a tic.",
        how: "free text. typical: 'silent by default — only mention time when it actually matters (scheduling, stale data, time-of-day mechanics)'.",
    },

    ai_chain_auto_limit: {
        what: "cap on how many AI turns can run in a row without u sending another msg.",
        why: "when the AI fetches data or does multi-step work, it chains its own turns. without a cap it could loop forever.",
        how: "slide 3-20. lower = gives up faster. higher = persists more. default = 10.",
    },
    ai_chain_auto_limit_warn_at: {
        what: "the turn where the AI starts wrapping up, before hitting the hard cap.",
        why: "graceful 'we are getting long, want me to keep going?' instead of just stopping cold.",
        how: "slide 2-19. must be less than the max above. default = 9.",
    },
    ai_poll_min_seconds: {
        what: "in live mode, the shortest gap between checks.",
        why: "live mode = AI watches stuff in real-time. too fast = battery drain + chat spam. this is the floor.",
        how: "slide 5-60 seconds. lower = tighter loop, more responsive but more pings. default = 15.",
    },
    ai_poll_max_seconds: {
        what: "in live mode, the longest gap between checks.",
        why: "when nothings happening, the AI can chill. this is the ceiling for how slow it goes.",
        how: "slide 60-600 seconds. higher = more relaxed when quiet. default = 120.",
    },
    ai_history_window: {
        what: "how many of ur recent msgs the AI keeps in mind.",
        why: "it needs context to know what u just asked or said. too small = forgets fast; too big = takes up space.",
        how: "slide 5-50 messages. default = 20.",
    },
    ai_clarify_threshold: {
        what: "how often the AI stops to ask 'do u mean X or Y?' vs just going with its best guess.",
        why: "some hate being asked stuff repeatedly. others want confirm-first before any action.",
        how: "free text. typical: 'ask only when it matters — if the ambiguity changes what i do, ask; otherwise go'.",
    },
    ai_suggestion_policy: {
        what: "when the AI offers a 'u could say X' suggestion after replying.",
        why: "some like the nudge; others find it presumptuous.",
        how: "free text. typical: 'only when the next step is obvious — never generic like anything else?'.",
    },
    ai_discovery_verbosity: {
        what: "how much the AI checks ur data before answering questions about it.",
        why: "thorough = more accurate. too thorough = slow + lots of queries.",
        how: "free text. typical: 'thorough — peek at the structure first, sample before claiming no results, dont assume'.",
    },
    ai_quiet_hours: {
        what: "times of day when the AI holds back non-urgent msgs.",
        why: "live mode can ping at any hour. set quiet hours so it doesnt buzz u at 3am.",
        how: "free text. one line per range. like '22:00–08:00: batch only' or '23:00–07:00: silent unless rare drop'. leave blank for no gating.",
    },

    ai_domain_priorities: {
        what: "which kinds of events the AI shouts about vs treats as routine.",
        why: "without priorities, everything gets equal attention — interesting events get buried in noise.",
        how: "free text. list event types by priority. like 'always: rare drops, pets, deaths. usually: 99s, raids. routine: xp, small drops'.",
    },
    ai_watched_rsns: {
        what: "clannies the AI gives extra attention to.",
        why: "in a big clan, AI cant narrate everyone equally. watched accounts get tighter coverage.",
        how: "one rsn per line. AI bumps how often it narrates these accounts.",
    },
    ai_topic_avoids: {
        what: "stuff the AI never narrates, no matter how big the event is.",
        why: "some events u just dont want surfaced — shame deaths, clan drama, whatever.",
        how: "one topic per line. AI silently drops events that match.",
    },
};
