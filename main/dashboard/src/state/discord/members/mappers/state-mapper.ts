import type { DiscordMember } from "../../client.js";

export interface DiscordMemberState {
    nickname: string | null;
}

export function memberStateOf(m: DiscordMember): DiscordMemberState {
    return { nickname: m.nickname };
}

export function displayLabelFor(m: DiscordMember): string {
    if (m.nickname !== null && m.nickname.length > 0) return m.nickname;
    if (m.display_name !== null && m.display_name.length > 0) return m.display_name;
    return m.name;
}
