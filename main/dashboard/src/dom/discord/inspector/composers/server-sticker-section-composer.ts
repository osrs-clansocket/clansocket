import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    type Instance,
} from "../../../factory";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import {
    deleteDiscordServerSticker,
    updateDiscordServerSticker,
    type DiscordServerSticker,
} from "../../../../state/discord/client.js";
import { DISCORD_INSPECTOR_SECTION_CLASS } from "../../../../shared/constants/clan-manage-discord/route-constants.js";
import {
    buildEditableTextSection,
    buildImageUrlReadonlySection,
    buildPairedMemberSection,
    buildReadonlySection,
} from "../builders/section-builder.js";

async function saveServerStickerPatch(
    sticker: DiscordServerSticker,
    patch: Partial<{ name: string; description: string | null; tags: string | null }>,
): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    const nextName = patch.name ?? sticker.name;
    if (nextName.length === 0) return;
    await updateDiscordServerSticker(sticker.guild_id, sticker.sticker_id, {
        userId: session.id,
        beforeName: sticker.name,
        name: nextName,
        description: patch.description !== undefined ? patch.description : sticker.description,
        tags: patch.tags !== undefined ? patch.tags : sticker.tags,
    });
}

async function confirmAndDeleteServerSticker(host: Instance, sticker: DiscordServerSticker): Promise<void> {
    const ok = await inlineConfirm(host, {
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        danger: true,
        cancelContext: `keep server sticker ${sticker.name}`,
        confirmContext: `confirm deleting server sticker ${sticker.name}`,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await deleteDiscordServerSticker(sticker.guild_id, sticker.sticker_id, {
        userId: session.id,
        targetName: sticker.name,
    });
}

const STICKER_FORMAT_LABELS: Record<number, string> = {
    1: "PNG",
    2: "APNG",
    3: "Lottie",
    4: "GIF",
};
const STICKER_FORMAT_UNKNOWN = "?";

export function serverStickerSections(sticker: DiscordServerSticker): Instance[] {
    const deleteHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const deleteBtn = button({
        classes: [],
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Delete sticker",
        ariaLabel: `Delete server sticker ${sticker.name}`,
        context: `delete the ${sticker.name} server sticker`,
        meta: ["action"],
        onClick: () => void confirmAndDeleteServerSticker(deleteHost, sticker),
    });
    deleteHost.addChild(deleteBtn);
    const deleteSection = div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [deleteHost]);
    return [
        buildEditableTextSection("Name", sticker.name, (next) => void saveServerStickerPatch(sticker, { name: next })),
        buildEditableTextSection(
            "Description",
            sticker.description ?? "",
            (next) => void saveServerStickerPatch(sticker, { description: next.length > 0 ? next : null }),
        ),
        buildEditableTextSection(
            "Tags",
            sticker.tags ?? "",
            (next) => void saveServerStickerPatch(sticker, { tags: next.length > 0 ? next : null }),
        ),
        buildReadonlySection({ title: "Sticker ID", value: sticker.sticker_id }),
        buildReadonlySection({
            title: "Format",
            value: STICKER_FORMAT_LABELS[sticker.format_type] ?? STICKER_FORMAT_UNKNOWN,
        }),
        buildReadonlySection({ title: "Available", value: sticker.available ? "yes" : "no" }),
        buildImageUrlReadonlySection("Image URL", sticker.image_url),
        ...buildPairedMemberSection("Uploaded by", sticker.guild_id, sticker.user_id),
        deleteSection,
    ];
}
