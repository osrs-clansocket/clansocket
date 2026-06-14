import {
    EVENT_BATCH,
    EVENT_CHAT,
    EVENT_COLLECTION_LOG_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENTS_CATALOG,
    EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENT_COMPLETED,
    EVENT_DIARIES,
    EVENT_DIARY_COMPLETED,
    EVENT_FARMING_PATCH,
    EVENT_QUESTS,
    EVENT_QUEST_COMPLETED,
} from "../../event-types.js";
import { color } from "../ansi.js";

type Formatter = (data: any) => string;

export const PROGRESS_FORMATTERS: Record<string, Formatter> = {
    [EVENT_QUESTS]: (data) => {
        const quests: { state: string }[] = Array.isArray(data.quests) ? data.quests : [];
        const finished = quests.filter((q) => q.state === "FINISHED").length;
        const inProgress = quests.filter((q) => q.state === "IN_PROGRESS").length;
        return `${quests.length} total  ${color("brightGreen", String(finished))} finished  ${color("yellow", String(inProgress))} in progress  ${color("dim", String(quests.length - finished - inProgress) + " not started")}`;
    },
    [EVENT_QUEST_COMPLETED]: (data) => `${color("bold", data.name)} ${color("dim", "id=" + data.id)}`,
    [EVENT_DIARIES]: (data) => {
        const entries: { complete: boolean }[] = Array.isArray(data.diaries) ? data.diaries : [];
        const complete = entries.filter((d) => d.complete).length;
        return `${complete}/${entries.length} tiers complete`;
    },
    [EVENT_DIARY_COMPLETED]: (data) => `${color("bold", data.region)} ${color("brightGreen", data.tier)}`,
    [EVENT_FARMING_PATCH]: (data) =>
        `${color("bold", "region=" + data.regionId)} ${color("dim", "varbit=" + data.varbitId)}  value=${data.value}`,
    [EVENT_COMBAT_ACHIEVEMENT_COMPLETED]: (data) =>
        `${color("bold", data.name)} ${color("dim", "[" + data.tier + "]")}  ${color("dim", "+" + data.points + "pts " + (data.bossName ?? "?"))}`,
    [EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT]: (data) => {
        const counts = data.tierCounts as Record<string, number>;
        const parts = Object.entries(counts)
            .map(([tier, n]) => `${tier.charAt(0)}${n}`)
            .join(" ");
        return `${color("bold", String(data.totalCompleted))} done  ${color("dim", parts)}`;
    },
    [EVENT_COMBAT_ACHIEVEMENTS_CATALOG]: (data) =>
        `${color("bold", String(data.tasks))} tasks  ${color("dim", "hash=" + (data.hash ?? "").slice(0, 8))}`,
    [EVENT_COLLECTION_LOG_SNAPSHOT]: (data) =>
        `${color("bold", String(data.itemCount))} items  ${color("dim", "hash=" + (data.hash ?? "").slice(0, 8))}`,
    [EVENT_BATCH]: (data) => {
        const events: { type: string }[] = Array.isArray(data.events) ? data.events : [];
        return color("dim", `(${events.length} child events: ${events.map((e) => e.type).join(", ")})`);
    },
    [EVENT_CHAT]: (data) => {
        if (data.kind === "BROADCAST") {
            return `${color("magenta", "[" + data.channel + "/BCAST]")} ${data.text}`;
        }
        const who = color("bold", data.senderRsn ?? data.rsn ?? "?") + color("dim", " w" + data.world);
        return `${color("dim", "[" + data.channel + "]")} ${who}: ${data.text}`;
    },
};
