import "../../../styles/pages/voxlab/voxlab-page.css";
import { div } from "../../factory";
import { router } from "../../../managers/router/index.js";
import { clanSlugFromVoxlabPath } from "../../../managers/router/slug-paths.js";
import { modalService } from "../../../managers/voxlab/services/modal-service.js";
import {
    VoxlabEditor,
    type PublishPayload,
    type VoxlabEditorInitialState,
} from "../../../managers/voxlab/voxlab-editor.js";
import { publishVoxlab } from "../../../state/clans/clans-client/branding.js";
import { getSiteLogoRecord, SITE_VOXLAB_PUBLISH_URL } from "../../../state/site/site-client.js";
import {
    loadSourceMesh,
    meshFromImageBlob,
    meshFromSource,
    type VoxlabSource,
} from "../../../voxlab/conversion/source-dispatch.js";
import type { MeshData } from "../../../voxlab/conversion/raster-to-mesh/types.js";

interface VoxlabPageCtx {
    slug: string;
    editor: VoxlabEditor;
    lastSource: VoxlabSource | null;
}

function renderVoxlab(path: string): HTMLElement {
    const slug = clanSlugFromVoxlabPath(path);
    if (slug.length === 0) return renderSiteVoxlab();
    return renderClanVoxlab(slug);
}

function renderClanVoxlab(slug: string): HTMLElement {
    const host = div({ classes: [], context: null, meta: null });
    const editor = new VoxlabEditor();
    const ctx: VoxlabPageCtx = { slug, editor, lastSource: null };
    editor.on("publish", (payload) => {
        void handlePublish(slug, payload, editor);
    });
    editor.on("reload", () => {
        void handleReload(ctx);
    });
    queueMicrotask(() => {
        void mountAndLoad(ctx, host.el);
    });
    return host.el;
}

function renderSiteVoxlab(): HTMLElement {
    const host = div({ classes: [], context: null, meta: null });
    const editor = new VoxlabEditor();
    editor.on("publish", (payload) => {
        void handleSitePublish(payload, editor);
    });
    queueMicrotask(() => {
        void mountAndLoadSite(editor, host.el);
    });
    return host.el;
}

async function mountAndLoad(ctx: VoxlabPageCtx, host: HTMLElement): Promise<void> {
    const published = await tryFetchPublishedEnvelope(ctx.slug);
    if (published) {
        ctx.editor.mount(host, { initial: published });
        return;
    }
    let mesh: MeshData | null = null;
    try {
        const result = await loadSourceMesh(ctx.slug);
        mesh = result.mesh;
        ctx.lastSource = result.source;
    } catch (err) {
        console.warn("[voxlab] auto-load failed", err);
    }
    ctx.editor.mount(host, mesh ? { initial: { mesh } } : undefined);
}

async function mountAndLoadSite(editor: VoxlabEditor, host: HTMLElement): Promise<void> {
    const published = await getSiteLogoRecord();
    if (published) {
        editor.mount(host, { initial: published });
        return;
    }
    let mesh: MeshData | null = null;
    try {
        const res = await fetch("/api/site/logo");
        if (res.ok) {
            const blob = await res.blob();
            const result = await meshFromImageBlob(blob);
            mesh = result.mesh;
        }
    } catch (err) {
        console.warn("[voxlab] site source mesh load failed", err);
    }
    editor.mount(host, mesh ? { initial: { mesh } } : undefined);
}

async function tryFetchPublishedEnvelope(slug: string): Promise<VoxlabEditorInitialState | null> {
    try {
        const res = await fetch(`/api/clans/${encodeURIComponent(slug)}/icon-record`);
        if (!res.ok) return null;
        const env = (await res.json()) as Partial<VoxlabEditorInitialState> | null;
        if (!env?.mesh) return null;
        return { mesh: env.mesh, snapshot: env.snapshot, timeline: env.timeline };
    } catch {
        return null;
    }
}

async function handleReload(ctx: VoxlabPageCtx): Promise<void> {
    try {
        if (ctx.lastSource === null) {
            const result = await loadSourceMesh(ctx.slug);
            ctx.lastSource = result.source;
            ctx.editor.applyMesh(result.mesh);
            return;
        }
        const mesh = await meshFromSource(ctx.lastSource);
        ctx.editor.applyMesh(mesh);
    } catch (err) {
        console.warn("[voxlab] mesh reload failed", err);
        await modalService.alert("Could not reload mesh from source.");
    }
}

async function handlePublish(slug: string, payload: PublishPayload, editor: VoxlabEditor): Promise<void> {
    const result = await publishVoxlab(slug, payload);
    if (result === null) {
        await modalService.alert("Publish failed — the server didn't accept the voxlab envelope.");
        return;
    }
    editor.unmount();
    router.navigate(`/clans/${slug}/manage/identity`);
}

async function handleSitePublish(payload: PublishPayload, editor: VoxlabEditor): Promise<void> {
    const result = await publishVoxlab("__site__", payload, SITE_VOXLAB_PUBLISH_URL);
    if (result === null) {
        await modalService.alert("Publish failed — the server didn't accept the voxlab envelope.");
        return;
    }
    editor.unmount();
    router.navigate("/");
}

export { renderVoxlab };
