import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { div, effect, paragraph, type Instance } from "../../../../../../factory";
import { createGuildSettingsFeed } from "../../../../../../../state/discord/guild-settings/guild-settings-feed.js";
import { guildDataVersion, listChannels } from "../../../../../../../state/discord/guild-state-cache.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import {
    setDiscordGuildAfk,
    setDiscordGuildDescription,
    setDiscordGuildName,
    setDiscordGuildSystemChannel,
    setDiscordGuildVerificationLevel,
    setDiscordGuildWelcomeScreen,
    type DiscordGuildSettings,
} from "../../../../../../../state/discord/client.js";
import { DISCORD_PANE_PLACEHOLDER_CLASS } from "../../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import {
    buildEditableCheckSection,
    buildEditableEnumSection,
    buildEditableTextChannelPickerSection,
    buildEditableTextSection,
    buildEditableVoiceChannelPickerSection,
    buildImageUrlReadonlySection,
} from "../../../../../../discord/inspector/builders/section-builder.js";

const LOADING_TEXT = "Loading guild settings…";
const EMPTY_AFK_TIMEOUT = 0;

const VERIFICATION_OPTIONS = [
    { value: "0", label: "0 — None" },
    { value: "1", label: "1 — Low (verified email)" },
    { value: "2", label: "2 — Medium (registered 5+ minutes)" },
    { value: "3", label: "3 — High (member 10+ minutes)" },
    { value: "4", label: "4 — Highest (verified phone)" },
];

const AFK_TIMEOUT_OPTIONS = [
    { value: "60", label: "1 minute" },
    { value: "300", label: "5 minutes" },
    { value: "900", label: "15 minutes" },
    { value: "1800", label: "30 minutes" },
    { value: "3600", label: "1 hour" },
];

function parseNumOrNull(s: string): number | null {
    if (s.length === 0) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function identityFields(s: DiscordGuildSettings, uid: string): Instance[] {
    return [
        buildEditableTextSection("Server name", s.name, (next) => {
            if (next.length === 0 || next === s.name) return;
            void setDiscordGuildName(s.guild_id, { userId: uid, beforeName: s.name, name: next });
        }),
        buildEditableTextSection("Description", s.description ?? "", (next) => {
            const v = next.length > 0 ? next : null;
            void setDiscordGuildDescription(s.guild_id, {
                userId: uid,
                guildName: s.name,
                beforeDescription: s.description,
                description: v,
            });
        }),
        buildImageUrlReadonlySection("Icon URL", s.icon_url),
        buildImageUrlReadonlySection("Banner URL", s.banner_url),
    ];
}

function structureFields(s: DiscordGuildSettings, uid: string): Instance[] {
    return [
        buildEditableTextChannelPickerSection("System channel", s.guild_id, s.system_channel_id, (next) => {
            if (next === s.system_channel_id) return;
            void setDiscordGuildSystemChannel(s.guild_id, {
                userId: uid,
                guildName: s.name,
                beforeChannelId: s.system_channel_id,
                channelId: next,
            });
        }),
        buildEditableVoiceChannelPickerSection("AFK channel", s.guild_id, s.afk_channel_id, (next) => {
            void setDiscordGuildAfk(s.guild_id, {
                userId: uid,
                guildName: s.name,
                beforeAfkChannelId: s.afk_channel_id,
                afkChannelId: next,
                beforeAfkTimeout: s.afk_timeout,
                afkTimeout: s.afk_timeout,
            });
        }),
        buildEditableEnumSection(
            "AFK timeout",
            AFK_TIMEOUT_OPTIONS,
            String(s.afk_timeout ?? EMPTY_AFK_TIMEOUT),
            (next) => {
                const v = parseNumOrNull(next);
                void setDiscordGuildAfk(s.guild_id, {
                    userId: uid,
                    guildName: s.name,
                    beforeAfkChannelId: s.afk_channel_id,
                    afkChannelId: s.afk_channel_id,
                    beforeAfkTimeout: s.afk_timeout,
                    afkTimeout: v,
                });
            },
        ),
    ];
}

function accessFields(s: DiscordGuildSettings, uid: string): Instance[] {
    return [
        buildEditableEnumSection("Verification level", VERIFICATION_OPTIONS, String(s.verification_level), (next) => {
            const lvl = parseNumOrNull(next);
            if (lvl === null || lvl === s.verification_level) return;
            void setDiscordGuildVerificationLevel(s.guild_id, {
                userId: uid,
                guildName: s.name,
                beforeLevel: s.verification_level,
                level: lvl,
            });
        }),
        buildEditableCheckSection("Welcome screen enabled", s.welcome_screen_enabled, (next) => {
            void setDiscordGuildWelcomeScreen(s.guild_id, {
                userId: uid,
                guildName: s.name,
                enabled: next,
                description: s.welcome_screen_description,
            });
        }),
        buildEditableTextSection("Welcome description", s.welcome_screen_description ?? "", (next) => {
            const v = next.length > 0 ? next : null;
            void setDiscordGuildWelcomeScreen(s.guild_id, {
                userId: uid,
                guildName: s.name,
                enabled: s.welcome_screen_enabled,
                description: v,
            });
        }),
    ];
}

function buildSettingsForm(s: DiscordGuildSettings): Instance {
    const sess = identityStore.session$();
    const uid = sess?.id ?? "";
    return div({ classes: [], context: null, meta: null }, [
        ...identityFields(s, uid),
        ...structureFields(s, uid),
        ...accessFields(s, uid),
    ]);
}

export function buildGuildSettingsMode(guildId: string): Instance {
    const pane = div({ classes: [], context: null, meta: null }, [
        paragraph({ classes: [DISCORD_PANE_PLACEHOLDER_CLASS], text: LOADING_TEXT, context: null, meta: null }),
    ]);
    let rendered = false;
    let firstSettings: DiscordGuildSettings | null = null;

    function tryRender(): void {
        if (rendered) return;
        if (firstSettings === null) return;
        if (listChannels(guildId).length === 0) return;
        rendered = true;
        pane.setChildren(buildSettingsForm(firstSettings));
    }

    const feed = createGuildSettingsFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            const rows = snap.rows as DiscordGuildSettings[];
            const first = rows[0];
            if (!first) return;
            firstSettings = first;
            tryRender();
        },
        () => undefined,
    );

    const watcher = effect(() => {
        guildDataVersion();
        tryRender();
    });

    pane.trackDispose({
        dispose: () => {
            unsubscribe();
            watcher.dispose();
        },
    });
    return pane;
}
