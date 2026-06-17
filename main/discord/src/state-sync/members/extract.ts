import type { GuildMember } from "discord.js";
import type { MemberRow } from "../types.js";

export function extractMemberRow(member: GuildMember): MemberRow {
    return {
        user_id: member.id,
        guild_id: member.guild.id,
        name: member.user.username,
        display_name: member.user.globalName ?? member.user.username,
        nickname: member.nickname,
        joined_at: member.joinedTimestamp,
        premium_since: member.premiumSinceTimestamp,
        communication_disabled_until: member.communicationDisabledUntilTimestamp,
        is_boosting: member.premiumSinceTimestamp !== null,
        is_bot: member.user.bot,
        role_ids: [...member.roles.cache.keys()],
        avatar_url: member.displayAvatarURL(),
        pending: member.pending ?? false,
        flags: member.flags.bitfield.toString(),
    };
}
