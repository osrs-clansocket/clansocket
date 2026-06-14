import { getTileRoot } from "../formatters/tile-url-formatter.js";

interface RawManifest {
    readonly version: number;
    readonly stride: number;
    readonly tiles: Record<string, Record<string, readonly number[]>>;
    readonly tilesMerged: Record<string, Record<string, readonly number[]>>;
}

interface CompiledManifest {
    readonly stride: number;
    readonly tiles: ReadonlyMap<string, ReadonlySet<number>>;
    readonly tilesMerged: ReadonlyMap<string, ReadonlySet<number>>;
}

const MANIFEST_URL = "/resources/osrs/image_world_map/tiles_manifest.json";

let manifest: CompiledManifest | null = null;
let loadPromise: Promise<void> | null = null;

function compileVariant(source: Record<string, Record<string, readonly number[]>>): Map<string, Set<number>> {
    const out = new Map<string, Set<number>>();
    for (const plane of Object.keys(source)) {
        const perZoom = source[plane]!;
        for (const zoom of Object.keys(perZoom)) {
            out.set(`${plane}:${zoom}`, new Set(perZoom[zoom]));
        }
    }
    return out;
}

export async function loadManifest(): Promise<void> {
    if (manifest !== null) return;
    if (loadPromise !== null) {
        await loadPromise;
        return;
    }
    loadPromise = (async () => {
        const res = await fetch(MANIFEST_URL);
        if (!res.ok) return;
        const raw = (await res.json()) as RawManifest;
        manifest = {
            stride: raw.stride,
            tiles: compileVariant(raw.tiles),
            tilesMerged: compileVariant(raw.tilesMerged),
        };
    })();
    await loadPromise;
}

export function tileExists(plane: number, zoom: number, tx: number, ty: number): boolean {
    if (manifest === null) return true;
    const variant = getTileRoot() === "tiles" ? manifest.tiles : manifest.tilesMerged;
    const set = variant.get(`${plane}:${zoom}`);
    if (set === undefined) return true;
    return set.has(tx * manifest.stride + ty);
}
