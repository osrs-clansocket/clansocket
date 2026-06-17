import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    icon,
    inlineConfirm,
    paragraph,
    treeView,
    TREE_ICON_CLASS,
    div,
    type Instance,
    type TreeNode,
} from "../../../../../../factory";
import { createMembersFeed } from "../../../../../../../state/discord/members/members-feed.js";
import { displayLabelFor } from "../../../../../../../state/discord/members/mappers/state-mapper.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import {
    kickDiscordMember,
    setDiscordMemberNickname,
    type DiscordMember,
} from "../../../../../../../state/discord/client.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";
import { DISCORD_PANE_PLACEHOLDER_CLASS } from "../../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const EMPTY_TEXT = "No members in this guild yet.";
const MEMBER_ICON = "person";
const BOT_ICON = "robot";
const MODE_HOST_CLASS = "clans-manage__discord-mode";

function iconForMember(member: DiscordMember): Instance {
    return icon({
        name: member.is_bot ? BOT_ICON : MEMBER_ICON,
        classes: [TREE_ICON_CLASS],
        context: null,
        meta: null,
    });
}

function sortedByLabel(members: readonly DiscordMember[]): DiscordMember[] {
    return [...members].sort((a, b) => displayLabelFor(a).localeCompare(displayLabelFor(b)));
}

function memberNicknameHandler(member: DiscordMember, guildId: string): (next: string) => Promise<boolean> {
    return async (next) => {
        const session = identityStore.session$();
        if (session === null) return false;
        const nextNickname = next.length === 0 ? null : next;
        return setDiscordMemberNickname(guildId, {
            userId: session.id,
            targetUserId: member.user_id,
            targetUserName: member.name,
            beforeNickname: member.nickname,
            nickname: nextNickname,
        });
    };
}

async function confirmAndKickMember(host: Instance, member: DiscordMember, guildId: string): Promise<void> {
    const label = displayLabelFor(member);
    const ok = await inlineConfirm(host, {
        cancelLabel: "Cancel",
        confirmLabel: "Kick",
        danger: true,
        cancelContext: `keep ${label} in the guild`,
        confirmContext: `confirm kicking ${label} from the guild`,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await kickDiscordMember(guildId, member.user_id, {
        userId: session.id,
        targetUserName: member.name,
    });
}

function leafFor(member: DiscordMember, guildId: string, host: Instance): TreeNode {
    const label = displayLabelFor(member);
    return {
        kind: "leaf",
        key: member.user_id,
        label,
        icon: iconForMember(member),
        title: member.name,
        onClick: () => selectDiscordItem({ kind: "member", data: member }),
        onLabelEdit: memberNicknameHandler(member, guildId),
        actions: [
            {
                iconName: "person-dash",
                title: `Kick ${label}`,
                onClick: () => void confirmAndKickMember(host, member, guildId),
                danger: true,
            },
        ],
    };
}

export function buildMembersMode(guildId: string): Instance {
    const treeHost = div({ classes: [], context: null, meta: null });
    const empty = paragraph({
        classes: [DISCORD_PANE_PLACEHOLDER_CLASS],
        text: EMPTY_TEXT,
        hidden: "",
        context: null,
        meta: null,
    });
    let latest: readonly DiscordMember[] = [];

    function rerender(): void {
        if (latest.length === 0) {
            treeHost.clear();
            empty.el.hidden = false;
            return;
        }
        empty.el.hidden = true;
        treeHost.setChildren(treeView(sortedByLabel(latest).map((m) => leafFor(m, guildId, treeHost))));
    }

    const feed = createMembersFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordMember[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(latest.map((m) => [m.user_id, m]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordMember);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            latest = [...byKey.values()];
            rerender();
        },
    );

    const modeHost = div({ classes: [MODE_HOST_CLASS], context: null, meta: null }, [treeHost, empty]);
    modeHost.trackDispose({ dispose: () => unsubscribe() });
    return modeHost;
}
