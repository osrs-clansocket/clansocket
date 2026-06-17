import { icon, image } from "../content-ops/graphics/media.js";
import { isRasterProvider, resolveIcon } from "../../../icons/providers";
import type { Instance } from "../core";
import type { ContextProps } from "../core/types.js";
import type { ReactiveValue } from "../reactive.js";
import { clanModelIcon } from "./clan-model-icon.js";

const FALLBACK_ICON = "bi-shield";

interface ClanAvatarInnerProps extends ContextProps {
    slug?: string;
    iconKind: "builtin" | "image" | "voxlab" | null | undefined;
    iconValue: string | null | undefined;
    imageVersion?: number;
    imgClass: string;
    glyphClass: string;
    src?: ReactiveValue<string>;
}

function staticImageSrc(slug: string | undefined, imageVersion: number | undefined): string {
    const s = slug ?? "";
    const versioned = imageVersion !== undefined ? `?v=${imageVersion}` : "";
    return `/api/clans/${encodeURIComponent(s)}/icon${versioned}`;
}

function clanAvatarInner(props: ClanAvatarInnerProps): Instance {
    if (props.iconKind === "voxlab") {
        if (!props.slug) {
            // Without a slug we can't fetch the envelope — fall back to the
            // static thumbnail at the conventional /icon URL.
            const src: ReactiveValue<string> = staticImageSrc(props.slug, props.imageVersion);
            return image({
                src,
                alt: "",
                classes: [props.imgClass],
                context: props.context,
                meta: props.meta,
            });
        }
        const host = clanModelIcon({
            slug: props.slug,
            imageVersion: props.imageVersion,
            context: props.context,
            meta: props.meta,
        });
        host.el.classList.add(props.imgClass);
        return host;
    }
    if (props.iconKind === "image") {
        const src: ReactiveValue<string> = props.src ?? staticImageSrc(props.slug, props.imageVersion);
        return image({
            src,
            alt: "",
            classes: [props.imgClass],
            context: props.context,
            meta: props.meta,
        });
    }
    const stored = props.iconKind === "builtin" && props.iconValue ? props.iconValue : FALLBACK_ICON;
    const { provider, name } = resolveIcon(stored);
    const isRaster = isRasterProvider(provider);
    return icon({
        provider,
        name,
        classes: [isRaster ? props.imgClass : props.glyphClass],
        alt: "",
        ariaHidden: true,
        context: props.context,
        meta: props.meta,
    });
}

export { clanAvatarInner };
export type { ClanAvatarInnerProps };
