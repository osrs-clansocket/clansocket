export interface ProviderConfig {
    readonly prefix: string;
    readonly baseClass: string;
    readonly label: string;
    readonly license: string;
    readonly attribution: string | null;
    readonly kind: "font" | "raster";
    readonly resolveSrc?: (name: string) => string | null;
}

export interface IconEntry {
    readonly provider: string;
    readonly name: string;
}

interface ProviderLoader {
    readonly config: ProviderConfig;
    readonly load: () => Promise<Record<string, number>>;
}

const OSRS_PICKER_FOLDERS: readonly string[] = ["player_types", "hiscores", "pets"];
const SPRITE_PREFIX = "sprite_";
const UNDERSCORE = "_";

function resolveSpriteSrc(name: string): string | null {
    const rest = name.slice(SPRITE_PREFIX.length);
    const cut = rest.indexOf(UNDERSCORE);
    if (cut <= 0) return null;
    const category = rest.slice(0, cut);
    const file = rest.slice(cut + 1);
    return `/resources/osrs/game_${category}/${file}.webp`;
}

function resolveOsrsSrc(name: string): string | null {
    if (name.startsWith(SPRITE_PREFIX)) return resolveSpriteSrc(name);
    for (const folder of OSRS_PICKER_FOLDERS) {
        const prefix = `${folder}${UNDERSCORE}`;
        if (name.startsWith(prefix)) {
            const file = name.slice(prefix.length);
            return `/resources/osrs/icon_${folder}/${file}.webp`;
        }
    }
    return null;
}

const LOADERS: readonly ProviderLoader[] = [
    {
        config: {
            prefix: "bi",
            baseClass: "bi",
            label: "Bootstrap Icons",
            license: "MIT",
            attribution: null,
            kind: "font",
        },
        load: async () => (await import("./bi.json")).default as Record<string, number>,
    },
    {
        config: {
            prefix: "ti",
            baseClass: "ti",
            label: "Tabler Icons",
            license: "MIT",
            attribution: null,
            kind: "font",
        },
        load: async () => (await import("./ti.json")).default as Record<string, number>,
    },
    {
        config: {
            prefix: "mdi",
            baseClass: "mdi",
            label: "Material Design Icons",
            license: "Apache 2.0",
            attribution: null,
            kind: "font",
        },
        load: async () => (await import("./mdi.json")).default as Record<string, number>,
    },
    {
        config: {
            prefix: "gi",
            baseClass: "gi",
            label: "Game-Icons.net",
            license: "CC BY 3.0",
            attribution: "Icons from game-icons.net (CC BY 3.0)",
            kind: "font",
        },
        load: async () => (await import("./gi.json")).default as Record<string, number>,
    },
    {
        config: {
            prefix: "ph",
            baseClass: "ph",
            label: "Phosphor Icons",
            license: "MIT",
            attribution: null,
            kind: "font",
        },
        load: async () => (await import("./ph.json")).default as Record<string, number>,
    },
    {
        config: { prefix: "lu", baseClass: "lucide", label: "Lucide", license: "ISC", attribution: null, kind: "font" },
        load: async () => (await import("./lu.json")).default as Record<string, number>,
    },
    {
        config: {
            prefix: "ra",
            baseClass: "ra",
            label: "RPG Awesome",
            license: "SIL OFL 1.1",
            attribution: null,
            kind: "font",
        },
        load: async () => (await import("./ra.json")).default as Record<string, number>,
    },
    {
        config: {
            prefix: "osrs",
            baseClass: "",
            label: "OSRS Sprites",
            license: "Jagex",
            attribution: "Sprites © Jagex Ltd.",
            kind: "raster",
            resolveSrc: resolveOsrsSrc,
        },
        load: async () => (await import("./osrs.json")).default as Record<string, number>,
    },
];

const PROVIDERS: ReadonlyMap<string, ProviderConfig> = new Map(LOADERS.map((l) => [l.config.prefix, l.config]));
const DEFAULT_PREFIX = "bi";

const glyphCache = new Map<string, readonly string[]>();
const inflight = new Map<string, Promise<readonly string[]>>();

async function loadGlyphs(loader: ProviderLoader): Promise<readonly string[]> {
    const cached = glyphCache.get(loader.config.prefix);
    if (cached) return cached;
    const pending = inflight.get(loader.config.prefix);
    if (pending) return pending;
    const promise = (async () => {
        const data = await loader.load();
        const sorted = Object.keys(data).sort();
        glyphCache.set(loader.config.prefix, sorted);
        inflight.delete(loader.config.prefix);
        return sorted;
    })();
    inflight.set(loader.config.prefix, promise);
    return promise;
}

export function listProviders(): readonly ProviderConfig[] {
    return LOADERS.map((l) => l.config);
}

export function getProvider(prefix: string): ProviderConfig | null {
    return PROVIDERS.get(prefix) ?? null;
}

export function resolveIcon(value: string): { provider: string; name: string } {
    const dash = value.indexOf("-");
    if (dash < 0) return { provider: DEFAULT_PREFIX, name: value };
    const candidate = value.slice(0, dash);
    if (PROVIDERS.has(candidate)) return { provider: candidate, name: value.slice(dash + 1) };
    return { provider: DEFAULT_PREFIX, name: value };
}

export function buildIconClasses(provider: string, name: string): readonly string[] {
    const cfg = PROVIDERS.get(provider) ?? PROVIDERS.get(DEFAULT_PREFIX)!;
    if (cfg.kind !== "font") return [];
    return [cfg.baseClass, `${cfg.prefix}-${name}`];
}

export function buildIconSrc(provider: string, name: string): string | null {
    const cfg = PROVIDERS.get(provider);
    if (!cfg || cfg.kind !== "raster" || !cfg.resolveSrc) return null;
    return cfg.resolveSrc(name);
}

export function isRasterProvider(provider: string): boolean {
    const cfg = PROVIDERS.get(provider);
    return cfg !== undefined && cfg.kind === "raster";
}

export async function loadAllIconEntries(): Promise<readonly IconEntry[]> {
    const lists = await Promise.all(LOADERS.map((l) => loadGlyphs(l)));
    const out: IconEntry[] = [];
    for (let i = 0; i < LOADERS.length; i += 1) {
        const prefix = LOADERS[i]!.config.prefix;
        for (const name of lists[i]!) out.push({ provider: prefix, name });
    }
    return out;
}

export function preloadIcons(): void {
    for (const loader of LOADERS) void loadGlyphs(loader);
}

const FAMILY_CSS_LOADERS: Record<string, () => Promise<unknown>> = {
    ti: () => import("../styles/auto-gen/icons/ti.css"),
    mdi: () => import("../styles/auto-gen/icons/mdi.css"),
    gi: () => import("../styles/auto-gen/icons/gi.css"),
    ph: () => import("../styles/auto-gen/icons/ph.css"),
    lu: () => import("../styles/auto-gen/icons/lu.css"),
    ra: () => import("../styles/auto-gen/icons/ra.css"),
};

const cssLoadedFamilies = new Set<string>();

export function ensureFamilyCss(provider: string): void {
    if (cssLoadedFamilies.has(provider)) return;
    cssLoadedFamilies.add(provider);
    const loader = FAMILY_CSS_LOADERS[provider];
    if (loader !== undefined) void loader();
}
