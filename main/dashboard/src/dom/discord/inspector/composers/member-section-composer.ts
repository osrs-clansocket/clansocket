import { derived, type Instance } from "../../../factory";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import { setDiscordMemberNickname, type DiscordMember } from "../../../../state/discord/client.js";
import { guildDataVersion, roleNameOr } from "../../../../state/discord/guild-state-cache.js";
import {
    buildEditableTextSection,
    buildImageUrlReadonlySection,
    buildReadonlySection,
} from "../builders/section-builder.js";

const NONE_VALUE = "—";
const ISO_DATE_END = 16;

const MEMBER_FLAG_NAMES: Record<number, string> = {
    1: "did rejoin",
    2: "completed onboarding",
    4: "bypasses verification",
    8: "started onboarding",
    16: "is guest",
    32: "started home actions",
    64: "completed home actions",
    128: "auto-moderation quarantined name",
    1024: "DM settings upsell acknowledged",
};

function formatMemberFlags(flags: string): string {
    if (flags.length === 0 || flags === "0") return "none";
    let big: bigint;
    try {
        big = BigInt(flags);
    } catch {
        return "none";
    }
    if (big === 0n) return "none";
    const names: string[] = [];
    for (const [bit, label] of Object.entries(MEMBER_FLAG_NAMES)) {
        const mask = BigInt(bit);
        if ((big & mask) !== 0n) names.push(label);
    }
    return names.length === 0 ? `unknown (${flags})` : names.join(", ");
}

async function saveMemberNickname(member: DiscordMember, nextNick: string): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    const nextNickname = nextNick.length > 0 ? nextNick : null;
    await setDiscordMemberNickname(member.guild_id, {
        userId: session.id,
        targetUserId: member.user_id,
        targetUserName: member.name,
        beforeNickname: member.nickname,
        nickname: nextNickname,
    });
}

function formatTimestamp(ms: number | null): string {
    if (ms === null) return NONE_VALUE;
    return new Date(ms).toISOString().slice(0, ISO_DATE_END).replace("T", " ");
}

function rolesNamesDerived(member: DiscordMember): () => string {
    return () => {
        guildDataVersion();
        if (member.role_ids.length === 0) return "no roles";
        return member.role_ids.map((rid) => roleNameOr(member.guild_id, rid, rid)).join(", ");
    };
}

export function memberSections(member: DiscordMember): Instance[] {
    const sections: Instance[] = [
        buildReadonlySection({ title: "Username", value: member.name }),
        buildReadonlySection({ title: "Display name", value: member.display_name ?? NONE_VALUE }),
        buildEditableTextSection("Nickname", member.nickname ?? "", (next) => void saveMemberNickname(member, next)),
        buildReadonlySection({ title: "User ID", value: member.user_id }),
        buildReadonlySection({ title: "Joined", value: formatTimestamp(member.joined_at) }),
        buildReadonlySection({ title: "Roles", value: derived(rolesNamesDerived(member)) }),
        buildReadonlySection({ title: "Bot account", value: member.is_bot ? "yes" : "no" }),
        buildReadonlySection({ title: "Boosting", value: member.is_boosting ? "yes" : "no" }),
        buildReadonlySection({
            title: "Verification pending",
            value: member.pending ? "yes — not yet completed onboarding/rules" : "no",
        }),
        buildReadonlySection({ title: "Member flags", value: formatMemberFlags(member.flags) }),
    ];
    if (member.premium_since !== null) {
        sections.push(buildReadonlySection({ title: "Boosting since", value: formatTimestamp(member.premium_since) }));
    }
    if (member.communication_disabled_until !== null) {
        sections.push(
            buildReadonlySection({
                title: "Timeout until",
                value: formatTimestamp(member.communication_disabled_until),
            }),
        );
    }
    sections.push(buildImageUrlReadonlySection("Avatar URL", member.avatar_url));
    return sections;
}
