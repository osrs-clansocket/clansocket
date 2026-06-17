import {
    BTN_VARIANT_BARE,
    BTN_VARIANT_OUTLINE,
    button,
    derived,
    div,
    icon,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    span,
    type Instance,
} from "../../../factory";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import { deleteDiscordChannelPermissions, type DiscordChannelOverwrite } from "../../../../state/discord/client.js";
import { channelNameOr, guildDataVersion } from "../../../../state/discord/guild-state-cache.js";
import { DISCORD_INSPECTOR_SECTION_CLASS } from "../../../../shared/constants/clan-manage-discord/route-constants.js";
import { PERMISSION_FLAG_NAMES } from "../../../../shared/constants/clan-manage-discord/permission-flags-constants.js";
import { buildLabelRow, buildReadonlySection } from "../builders/section-builder.js";
import {
    cyclePermission,
    iconNameForState,
    modifierForState,
    targetIdOf,
    targetNameOf,
    tristateFor,
} from "../util/permission-cycle.js";

const PERMISSION_GRID_CLASS = "clans-manage__discord-permission-grid";
const PERMISSION_CARD_CLASS = "clans-manage__discord-permission-card";
const PERMISSION_CARD_MODIFIER_PREFIX = "clans-manage__discord-permission-card--";
const PERMISSION_CARD_LABEL_CLASS = "clans-manage__discord-permission-card-label";
const PERMISSION_CARD_ICON_CLASS = "clans-manage__discord-permission-card-icon";

function permissionCard(o: DiscordChannelOverwrite, bit: number, name: string): Instance {
    const state = tristateFor(o.allow, o.deny, bit);
    const modifier = modifierForState(state);
    return button(
        {
            classes: [PERMISSION_CARD_CLASS, `${PERMISSION_CARD_MODIFIER_PREFIX}${modifier}`],
            variant: BTN_VARIANT_BARE,
            ariaLabel: `${name} permission (currently ${state}). Click to cycle.`,
            title: `click to cycle (current: ${state})`,
            context: `cycle the ${name} permission state for this overwrite`,
            meta: ["action"],
            onClick: () => void cyclePermission(o, bit),
        },
        [
            icon({
                name: iconNameForState(state),
                classes: [PERMISSION_CARD_ICON_CLASS],
                context: null,
                meta: null,
            }),
            span({ classes: [PERMISSION_CARD_LABEL_CLASS], text: name, context: null, meta: null }),
        ],
    );
}

function permissionCardGrid(o: DiscordChannelOverwrite): Instance {
    const cards = PERMISSION_FLAG_NAMES.map((name, i) => permissionCard(o, i, name));
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow("Permissions (click to cycle)", null),
        div({ classes: [PERMISSION_GRID_CLASS], context: null, meta: null }, cards),
    ]);
}

async function confirmAndDeleteOverwrite(host: Instance, o: DiscordChannelOverwrite): Promise<void> {
    const tid = targetIdOf(o);
    const ok = await inlineConfirm(host, {
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        danger: true,
        cancelContext: `keep the ${o.kind} permission overwrite for ${tid}`,
        confirmContext: `confirm deleting the ${o.kind} permission overwrite for ${tid}`,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await deleteDiscordChannelPermissions(o.guild_id, o.channel_id, tid, {
        userId: session.id,
        targetName: o.channel_id,
        overwriteKind: o.kind,
        overwriteTargetId: tid,
        overwriteTargetName: tid,
    });
}

function targetNameDerived(o: DiscordChannelOverwrite): () => string {
    return () => {
        guildDataVersion();
        return targetNameOf(o);
    };
}

export function channelOverwriteSections(o: DiscordChannelOverwrite): Instance[] {
    const tid = targetIdOf(o);
    const deleteHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const deleteBtn = button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Delete overwrite",
        ariaLabel: `Delete ${o.kind} permission overwrite for ${tid}`,
        context: `delete the ${o.kind} permission overwrite for ${tid}`,
        meta: ["action"],
        onClick: () => void confirmAndDeleteOverwrite(deleteHost, o),
    });
    deleteHost.addChild(deleteBtn);
    const deleteSection = div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [deleteHost]);
    return [
        buildReadonlySection({
            title: "Channel",
            value: derived(() => {
                guildDataVersion();
                return channelNameOr(o.guild_id, o.channel_id, o.channel_id);
            }),
        }),
        buildReadonlySection({ title: "Channel ID", value: o.channel_id }),
        buildReadonlySection({ title: "Kind", value: o.kind }),
        buildReadonlySection({ title: "Target", value: derived(targetNameDerived(o)) }),
        buildReadonlySection({ title: "Target ID", value: tid }),
        permissionCardGrid(o),
        deleteSection,
    ];
}
