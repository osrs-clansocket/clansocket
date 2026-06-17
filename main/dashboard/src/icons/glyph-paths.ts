export interface GlyphPath {
    d: string;
    advance: number;
}

type GlyphPathMap = Record<string, GlyphPath>;

const FAMILY_PATHS_LOADERS: Record<string, () => Promise<GlyphPathMap>> = {
    bi: async () => (await import("./bi-paths.json")).default as GlyphPathMap,
    ti: async () => (await import("./ti-paths.json")).default as GlyphPathMap,
    mdi: async () => (await import("./mdi-paths.json")).default as GlyphPathMap,
    gi: async () => (await import("./gi-paths.json")).default as GlyphPathMap,
    ph: async () => (await import("./ph-paths.json")).default as GlyphPathMap,
    lu: async () => (await import("./lu-paths.json")).default as GlyphPathMap,
    ra: async () => (await import("./ra-paths.json")).default as GlyphPathMap,
};

const pathCache = new Map<string, GlyphPathMap>();
const pathInflight = new Map<string, Promise<GlyphPathMap>>();

export async function loadGlyphPath(provider: string, name: string): Promise<GlyphPath | null> {
    const cached = pathCache.get(provider);
    if (cached !== undefined) return cached[name] ?? null;
    const inflight = pathInflight.get(provider);
    if (inflight !== undefined) {
        const map = await inflight;
        return map[name] ?? null;
    }
    const loader = FAMILY_PATHS_LOADERS[provider];
    if (loader === undefined) return null;
    const promise = loader().then((map) => {
        pathCache.set(provider, map);
        pathInflight.delete(provider);
        return map;
    });
    pathInflight.set(provider, promise);
    const map = await promise;
    return map[name] ?? null;
}

export function isVectorProvider(provider: string): boolean {
    return FAMILY_PATHS_LOADERS[provider] !== undefined;
}
