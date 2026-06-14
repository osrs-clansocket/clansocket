import { type Color, color } from "./ansi.js";
import { shortSession, truncatePad } from "./format.js";

const PREFIX = "[plugin]";
const TYPE_WIDTH = 14;
const RSN_WIDTH = 12;
const CLAN_WIDTH = 16;

interface SessionTag {
    rsn: string;
    clanName: string | null;
}

export const sessionTags = new Map<string, SessionTag>();

export interface IdentityLogData {
    rsn: string;
    accountHash: string;
    world: number;
    mode: string;
    activity?: string;
    clanName?: string | null;
    clanRank?: string | null;
    clanMemberCount?: number | null;
    clanOnlineCount?: number | null;
    worldTypes: string[];
}

export function sessionHead(type: string, sessionId: string): string {
    const tag = sessionTags.get(sessionId);
    const rsn = truncatePad(tag?.rsn ?? "—", RSN_WIDTH);
    const clan = truncatePad(tag?.clanName ?? "—", CLAN_WIDTH);
    return `${PREFIX} ${type.padEnd(TYPE_WIDTH)} ${shortSession(sessionId)}  ${color("bold", rsn)} ${color("cyan", clan)}`;
}

export const COLOR_BY_TYPE: Record<string, Color> = {
    xp_gained: "green",
    level_up: "brightGreen",
    death: "brightRed",
    location: "dim",
    vitals: "dim",
    prayers: "yellow",
    status_effect: "magenta",
    interacting: "blue",
    container: "cyan",
    world_hop: "brightYellow",
    menu_action: "brightCyan",
    stats: "magenta",
    bank_open: "brightYellow",
    bank_close: "brightYellow",
    damage_dealt: "green",
    damage_taken: "brightRed",
    container_delta: "brightGreen",
    loot: "brightYellow",
    boosts: "magenta",
    chat: "cyan",
    combat_achievement_completed: "brightYellow",
    combat_achievements_snapshot: "yellow",
    combat_achievements_catalog: "magenta",
    collection_log_snapshot: "brightGreen",
    slayer: "brightGreen",
    login_state: "brightCyan",
    rune_pouch: "cyan",
    quests: "magenta",
    quest_completed: "brightGreen",
    diaries: "magenta",
    diary_completed: "brightGreen",
    farming_patch: "green",
    batch: "bold",
};
