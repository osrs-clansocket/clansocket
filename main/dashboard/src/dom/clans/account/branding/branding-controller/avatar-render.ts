import { clanAvatarInner, createInstance } from "../../../../factory";

export interface AvatarRenderArgs {
    avatarEl: HTMLElement;
    slug: string;
    iconKind: "builtin" | "image" | null;
    iconValue: string | null;
    imageVersion: number;
    color: string;
}

export function renderClanAvatar(args: AvatarRenderArgs): void {
    args.avatarEl.style.setProperty("--branding-accent", args.color);
    const inst = createInstance(args.avatarEl);
    inst.clear();
    inst.addChild(
        clanAvatarInner({
            slug: args.slug,
            iconKind: args.iconKind,
            iconValue: args.iconValue,
            imageVersion: args.imageVersion,
            imgClass: "account__branding-avatar-img",
            glyphClass: "account__branding-avatar-glyph",
            context: null,
            meta: null,
        }),
    );
}
