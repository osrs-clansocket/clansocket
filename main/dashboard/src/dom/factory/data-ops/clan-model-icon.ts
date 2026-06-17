import "../../../styles/components/data/clan-model-icon-component.css";
import "../../../styles/effects/fx/fold-in-effect.css";
import "../../../styles/effects/fx/fold-out-effect.css";
import { image } from "../content-ops/graphics/media.js";
import { div } from "../layout-ops/structural/container.js";
import { addEffectClass } from "../effect-helpers.js";
import type { Instance } from "../core";
import type { ContextProps } from "../core/types.js";
import { VoxlabRenderer } from "../../../managers/voxlab/voxlab-renderer.js";
import type { PublishPayload } from "../../../managers/voxlab/voxlab-editor.js";
import { AppEvents, events, type ClanTransformChangedPayload } from "../../../managers/events";

const BLOCK_CLASS = "clan-model-icon";
const IMAGE_CLASS = "clan-model-icon__image";
const MESH_CLASS = "clan-model-icon__mesh";
const ACTIVE_MOD = "clan-model-icon--webgl-active";
const MOBILE_PAN_QUERY = "(width <= 48rem)";

// Centralized voxlab model icon: ONE component for every render site
// (header, your-clans entries, branding avatar preview, tweaker preview,
// homepage site logo, …). Each instance:
//   1. shows a static thumbnail PNG immediately (webgl-unavailable fallback
//      AND zero-flash initial paint while the renderer fetches its envelope)
//   2. async-mounts a VoxlabRenderer over the fallback; the rendered canvas
//      covers the img once it's ready
//   3. subscribes to CLAN_TRANSFORM_CHANGED for the slug — tweaker sliders
//      live-update every instance via CSS transform on the render target
//
// Default endpoints are clan-scoped (`/api/clans/<slug>/icon` + `-record`).
// Pass `recordUrl` + `thumbnailUrl` overrides to consume a different endpoint
// pair (e.g. `/api/site/logo` for the homepage site logo). The slug stays
// required as the event-subscription key — for non-clan consumers it can be
// any synthetic identifier (no tweaker fires CLAN_TRANSFORM_CHANGED for it).

interface ClanModelIconTransform {
    scale: number;
    rotate: number;
    translateX: number;
    translateY: number;
}

interface ClanModelIconProps extends ContextProps {
    slug: string;
    initialTransform?: ClanModelIconTransform;
    imageVersion?: number;
    recordUrl?: string;
    thumbnailUrl?: string;
    mobilePanX?: number;
}

const VOXLAB_RENDERERS = new WeakMap<HTMLElement, VoxlabRenderer>();

function defaultThumbnailUrl(slug: string): string {
    return `/api/clans/${encodeURIComponent(slug)}/icon`;
}

function defaultRecordUrl(slug: string): string {
    return `/api/clans/${encodeURIComponent(slug)}/icon-record`;
}

function thumbnailSrcWithVersion(baseUrl: string, imageVersion?: number): string {
    if (imageVersion === undefined) return baseUrl;
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}v=${imageVersion}`;
}

function applyTransformCss(el: HTMLElement, t: ClanModelIconTransform): void {
    el.style.transform = `scale(${t.scale}) rotate(${t.rotate}deg) translate(${t.translateX}px, ${t.translateY}px)`;
}

async function mountVoxlabRendererOn(host: HTMLElement, recordUrl: string, thumbnailUrl: string): Promise<boolean> {
    try {
        const recordRes = await fetch(recordUrl);
        if (!recordRes.ok) return false;
        const envelope = (await recordRes.json()) as Omit<PublishPayload, "thumbnailPng"> | null;
        if (!envelope?.mesh) return false;
        // Thumbnail is the static fallback layer — VoxlabRenderer.setPayload
        // never reads it. Mount the renderer even if the thumbnail is missing
        // (e.g. envelope-only JSON uploads); WebGL renders the mesh directly.
        let thumbnailPng: Blob;
        try {
            const thumbRes = await fetch(thumbnailUrl);
            thumbnailPng = thumbRes.ok ? await thumbRes.blob() : new Blob([], { type: "image/png" });
        } catch {
            thumbnailPng = new Blob([], { type: "image/png" });
        }
        if (VOXLAB_RENDERERS.has(host)) return true;
        const renderer = new VoxlabRenderer();
        renderer.mount(host, { ...envelope, thumbnailPng });
        renderer.start();
        VOXLAB_RENDERERS.set(host, renderer);
        return true;
    } catch (err) {
        console.warn("[clan-model-icon] renderer mount failed", err);
        return false;
    }
}

function clanModelIcon(props: ClanModelIconProps): Instance {
    const recordUrl = props.recordUrl ?? defaultRecordUrl(props.slug);
    const thumbnailUrl = props.thumbnailUrl ?? defaultThumbnailUrl(props.slug);

    const host = div({
        classes: [BLOCK_CLASS],
        context: props.context,
        meta: props.meta,
    });

    // Layer 1: static thumbnail PNG. Zero-flash initial paint AND the
    // WebGL-unavailable fallback. CSS controls visibility via the
    // --webgl-active modifier — no inline style toggling here.
    const fallbackImg = image({
        src: thumbnailSrcWithVersion(thumbnailUrl, props.imageVersion),
        alt: "",
        classes: [IMAGE_CLASS],
        context: null,
        meta: null,
    });
    host.el.appendChild(fallbackImg.el);

    // Layer 2: render target hosts the WebGL canvas + carries the tweaker's
    // CSS transform. Starts opacity:0 via the --mesh class so it doesn't
    // flash an empty canvas before mount; the --webgl-active modifier on the
    // host runs the fold-in keyframes once the renderer takes over.
    const renderTarget = div({ classes: [MESH_CLASS], context: null, meta: null });
    if (props.initialTransform) {
        applyTransformCss(renderTarget.el, props.initialTransform);
    }
    host.el.appendChild(renderTarget.el);

    void mountVoxlabRendererOn(renderTarget.el, recordUrl, thumbnailUrl).then((mounted) => {
        if (!mounted) return;
        host.el.classList.add(ACTIVE_MOD);
        addEffectClass(fallbackImg.el, "fold-out");
        addEffectClass(renderTarget.el, "fold-in");
        if (props.mobilePanX !== undefined) {
            const renderer = VOXLAB_RENDERERS.get(renderTarget.el);
            if (renderer) {
                const mq = window.matchMedia(MOBILE_PAN_QUERY);
                const panX = props.mobilePanX;
                const applyPan = (): void => {
                    renderer.setHorizontalPan(mq.matches ? panX : 0);
                };
                applyPan();
                mq.addEventListener("change", applyPan);
            }
        }
    });

    // Live transform sync: tweaker slider drags emit CLAN_TRANSFORM_CHANGED;
    // every instance for the same slug listens and re-applies. NOTE: no
    // unsubscribe path — listener accumulates on long-lived sessions. Future
    // cleanup via MutationObserver on host disconnection.
    events.on(AppEvents.CLAN_TRANSFORM_CHANGED, (...args: unknown[]) => {
        const payload = args[0] as ClanTransformChangedPayload | undefined;
        if (!payload || payload.slug !== props.slug) return;
        applyTransformCss(renderTarget.el, payload.transform);
    });

    return host;
}

export { clanModelIcon };
export type { ClanModelIconProps };
