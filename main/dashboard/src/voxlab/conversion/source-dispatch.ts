import { loadGlyphPath } from "../../icons/glyph-paths.js";
import { resolveIcon } from "../../icons/providers.js";
import { rasterToMesh } from "./raster-to-mesh/index.js";
import type { ImageDataLike, MeshData } from "./raster-to-mesh/types.js";
import { vectorToMesh } from "./vector-to-mesh/index.js";

export type VoxlabSource =
    | { kind: "raster"; imageData: ImageDataLike }
    | { kind: "svg-text"; svgText: string }
    | { kind: "vector-glyph"; provider: string; name: string };

const SVG_MIME = "image/svg+xml";

export async function loadSourceMesh(slug: string): Promise<{ mesh: MeshData; source: VoxlabSource }> {
    const urlParams = new URLSearchParams(window.location.search);
    const kindParam = urlParams.get("kind");
    const valueParam = urlParams.get("value");
    if (kindParam === "builtin" && valueParam !== null) {
        return loadFontGlyphSource(valueParam);
    }
    return loadImageSource(slug);
}

export async function meshFromSource(source: VoxlabSource): Promise<MeshData> {
    switch (source.kind) {
        case "raster":
            return rasterToMesh({ imageData: source.imageData });
        case "svg-text":
            return vectorToMesh({ source: { kind: "svg-text", svgText: source.svgText } });
        case "vector-glyph":
            return meshFromGlyph(source.provider, source.name);
    }
}

async function loadFontGlyphSource(value: string): Promise<{ mesh: MeshData; source: VoxlabSource }> {
    const { provider, name } = resolveIcon(value);
    const mesh = await meshFromGlyph(provider, name);
    return { mesh, source: { kind: "vector-glyph", provider, name } };
}

async function meshFromGlyph(provider: string, name: string): Promise<MeshData> {
    const glyphPath = await loadGlyphPath(provider, name);
    if (glyphPath === null) throw new Error(`no vector path data for ${provider}-${name}`);
    return vectorToMesh({ source: { kind: "svg-path", pathData: glyphPath.d } });
}

async function loadImageSource(slug: string): Promise<{ mesh: MeshData; source: VoxlabSource }> {
    const blob = await fetchClanIconBlob(slug);
    return meshFromImageBlob(blob);
}

export async function meshFromImageBlob(blob: Blob): Promise<{ mesh: MeshData; source: VoxlabSource }> {
    if (blob.type === SVG_MIME) {
        const svgText = await blob.text();
        return {
            mesh: vectorToMesh({ source: { kind: "svg-text", svgText } }),
            source: { kind: "svg-text", svgText },
        };
    }
    const imageData = await blobToImageData(blob);
    return { mesh: rasterToMesh({ imageData }), source: { kind: "raster", imageData } };
}

async function fetchClanIconBlob(slug: string): Promise<Blob> {
    const res = await fetch(`/api/clans/${encodeURIComponent(slug)}/icon?pristine=1`);
    if (!res.ok) throw new Error(`icon fetch ${res.status}`);
    return await res.blob();
}

async function blobToImageData(blob: Blob): Promise<ImageDataLike> {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("could not acquire 2d context");
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}
