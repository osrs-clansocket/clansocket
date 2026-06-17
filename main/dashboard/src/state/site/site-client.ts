import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";
import type { VoxlabEditorInitialState } from "../../managers/voxlab/voxlab-editor.js";

const THUMBNAIL_TARGET_PX = 512;

export const SITE_VOXLAB_PUBLISH_URL = "/api/site/logo-record";

export interface SiteOwnerStatus {
    isOwner: boolean;
}

export async function getSiteOwnerStatus(): Promise<SiteOwnerStatus> {
    try {
        const res = await sameOriginFetch("/api/site/me");
        if (!res.ok) return { isOwner: false };
        return (await res.json()) as SiteOwnerStatus;
    } catch {
        return { isOwner: false };
    }
}

export async function getSiteLogoRecord(): Promise<VoxlabEditorInitialState | null> {
    try {
        const res = await sameOriginFetch("/api/site/logo-record");
        if (!res.ok) return null;
        const env = (await res.json()) as VoxlabEditorInitialState | null;
        if (!env?.mesh) return null;
        return env;
    } catch {
        return null;
    }
}

async function convertToPngBlob(file: File): Promise<Blob> {
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("image load failed"));
            img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = THUMBNAIL_TARGET_PX;
        canvas.height = THUMBNAIL_TARGET_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas context unavailable");
        const scale = Math.min(THUMBNAIL_TARGET_PX / img.width, THUMBNAIL_TARGET_PX / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (THUMBNAIL_TARGET_PX - w) / 2;
        const y = (THUMBNAIL_TARGET_PX - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("toBlob failed"));
            }, "image/png");
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function uploadSiteImage(file: File): Promise<boolean> {
    let pngBlob: Blob;
    try {
        pngBlob = await convertToPngBlob(file);
    } catch {
        return false;
    }
    const form = new FormData();
    form.append("file", pngBlob, "logo.png");
    try {
        const res = await sameOriginFetch("/api/site/logo", {
            method: "POST",
            body: form,
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function uploadSiteEnvelopeJson(file: File): Promise<boolean> {
    let text: string;
    try {
        text = await file.text();
    } catch {
        return false;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return false;
    }
    if (typeof parsed !== "object" || parsed === null || !("mesh" in parsed)) return false;
    const form = new FormData();
    form.append("envelope", text);
    try {
        const res = await sameOriginFetch("/api/site/logo-record", {
            method: "POST",
            body: form,
        });
        return res.ok;
    } catch {
        return false;
    }
}
