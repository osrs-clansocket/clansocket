import { identityClient } from "../../identity/identity-client/index.js";
import { readJsonOrFallback } from "../../fetch-result.js";
import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";
import type { PublishPayload } from "../../../managers/voxlab/voxlab-editor.js";

export type ClanIconKind = "builtin" | "image" | "voxlab";

export interface IconTransform {
    scale: number;
    rotate: number;
    translateX: number;
    translateY: number;
}

export interface BrandingUpdate {
    iconKind: ClanIconKind | null;
    iconValue: string | null;
    color: string | null;
}

export type UploadResult =
    | { ok: true; update: BrandingUpdate }
    | {
          ok: false;
          reason: "too_large" | "bad_mime" | "process_failed" | "no_file" | "upload_failed";
          maxBytes?: number;
          mime?: string;
      };

export type CustomizeResult =
    | { ok: true; imageVersion: number; transform: IconTransform }
    | {
          ok: false;
          reason: "source_not_tweakable" | "no_pristine_icon" | "bake_failed" | "failed";
          sourceExt?: string;
          detail?: string;
      };

export async function updateClanBranding(slug: string, update: BrandingUpdate): Promise<BrandingUpdate | null> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/branding`, {
        method: "PUT",
        body: JSON.stringify(update),
    });
    return readJsonOrFallback<BrandingUpdate | null>(res, null);
}

type UploadErrorBody = { error?: string; maxBytes?: number; mime?: string };

const UPLOAD_ERROR_MAP: Record<string, (b: UploadErrorBody) => UploadResult> = {
    too_large: (b) => ({ ok: false, reason: "too_large", maxBytes: b.maxBytes }),
    bad_mime: (b) => ({ ok: false, reason: "bad_mime", mime: b.mime }),
    process_failed: () => ({ ok: false, reason: "process_failed" }),
    no_file: () => ({ ok: false, reason: "no_file" }),
};

function mapUploadError(body: UploadErrorBody): UploadResult | null {
    const fn = UPLOAD_ERROR_MAP[body.error ?? ""];
    return fn ? fn(body) : null;
}

function mapCustomizeError(body: { error?: string; sourceExt?: string; detail?: string }): CustomizeResult | null {
    switch (body.error) {
        case "source_not_tweakable":
            return { ok: false, reason: "source_not_tweakable", sourceExt: body.sourceExt };
        case "no_pristine_icon":
            return { ok: false, reason: "no_pristine_icon" };
        case "bake_failed":
            return { ok: false, reason: "bake_failed", detail: body.detail };
        default:
            return null;
    }
}

async function readErrorBody<T>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export async function uploadClanIcon(slug: string, file: File): Promise<UploadResult> {
    const fd = new FormData();
    fd.append("icon", file);
    const res = await sameOriginFetch(`/api/clans/${encodeURIComponent(slug)}/branding/upload`, {
        method: "POST",
        body: fd,
    });
    if (res.ok) {
        return { ok: true, update: (await res.json()) as BrandingUpdate };
    }
    const body = await readErrorBody<{ error?: string; maxBytes?: number; mime?: string }>(res);
    return (body && mapUploadError(body)) ?? { ok: false, reason: "upload_failed" };
}

export async function customizeClanIcon(slug: string, transform: IconTransform): Promise<CustomizeResult> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/branding/customize`, {
        method: "POST",
        body: JSON.stringify(transform),
    });
    if (res.ok) {
        const body = (await res.json()) as { imageVersion?: number; transform?: IconTransform };
        return {
            ok: true,
            imageVersion: body.imageVersion ?? Date.now(),
            transform: body.transform ?? transform,
        };
    }
    const body = await readErrorBody<{ error?: string; sourceExt?: string; detail?: string }>(res);
    return (body && mapCustomizeError(body)) ?? { ok: false, reason: "failed" };
}

export async function publishVoxlab(
    slug: string,
    payload: PublishPayload,
    endpointOverride?: string,
): Promise<BrandingUpdate | null> {
    const fd = new FormData();
    // JSON.stringify of a Float32Array / Uint32Array yields {"0":x,"1":y,...}
    // (indexed-object format) — typed arrays aren't `Array.isArray(true)`, so
    // they serialize as plain objects. On re-load `Float32Array.from(thatObj)`
    // sees no `.length` and returns an empty array, leaving the mesh with
    // zero vertices. Convert to plain Array before stringify so the JSON
    // round-trip preserves the geometry as `[x, y, z, …]`.
    fd.append(
        "envelope",
        JSON.stringify({
            payloadVersion: payload.payloadVersion,
            mesh: {
                positions: Array.from(payload.mesh.positions),
                indices: Array.from(payload.mesh.indices),
                normals: Array.from(payload.mesh.normals),
                colors: Array.from(payload.mesh.colors),
                metadata: payload.mesh.metadata,
            },
            snapshot: payload.snapshot,
            timeline: payload.timeline,
        }),
    );
    fd.append("thumbnail", payload.thumbnailPng, "thumbnail.png");
    const url = endpointOverride ?? `/api/clans/${encodeURIComponent(slug)}/branding/voxlab-publish`;
    const res = await identityClient.authedFetch(url, {
        method: "POST",
        body: fd,
    });
    return readJsonOrFallback<BrandingUpdate | null>(res, null);
}

export async function clearClanIconCustomization(slug: string): Promise<{ ok: boolean; imageVersion: number }> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/branding/customize/clear`, {
        method: "POST",
        body: "{}",
    });
    if (!res.ok) return { ok: false, imageVersion: Date.now() };
    const body = (await res.json()) as { imageVersion?: number };
    return { ok: true, imageVersion: body.imageVersion ?? Date.now() };
}
