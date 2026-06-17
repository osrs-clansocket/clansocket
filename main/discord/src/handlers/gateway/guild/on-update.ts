import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { postServerFeatures } from "../../../state-sync/features/post-features.js";
import { extractGuildSettingsRow } from "../../../state-sync/guild-settings/extract.js";
import { postGuildSettingsUpsert } from "../../../state-sync/guild-settings/post-upsert.js";

const TRIGGER_ID = "discord:guild.updated";

function sameFeatures(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const set = new Set(a);
    for (const f of b) if (!set.has(f)) return false;
    return true;
}

export function wireGuildUpdateListener(client: Client): void {
    client.on(Events.GuildUpdate, (oldGuild, newGuild) => {
        fire(TRIGGER_ID, {
            id: newGuild.id,
            name: newGuild.name,
        });
        void (async () => {
            const settings = await extractGuildSettingsRow(newGuild);
            await postGuildSettingsUpsert(newGuild.id, settings);
        })();
        const oldFeatures = [...oldGuild.features];
        const newFeatures = [...newGuild.features];
        if (sameFeatures(oldFeatures, newFeatures)) return;
        void postServerFeatures(newGuild.id, newFeatures);
    });
}
