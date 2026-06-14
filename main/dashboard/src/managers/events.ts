type Listener = (...args: unknown[]) => void;

const registry = new Map<string, Set<Listener>>();

const events = {
    on(event: string, fn: Listener): () => void {
        if (!registry.has(event)) registry.set(event, new Set());
        registry.get(event)!.add(fn);
        return () => registry.get(event)?.delete(fn);
    },

    once(event: string, fn: Listener): () => void {
        const wrapper: Listener = (...args) => {
            off();
            fn(...args);
        };
        const off = this.on(event, wrapper);
        return off;
    },

    emit(event: string, ...args: unknown[]): void {
        registry.get(event)?.forEach((fn) => fn(...args));
    },

    off(event: string, fn?: Listener): void {
        if (fn) {
            registry.get(event)?.delete(fn);
        } else {
            registry.delete(event);
        }
    },
} as const;

const AppEvents = {
    NAV_TOGGLE: "nav:toggle",
    NAV_CLOSE: "nav:close",
    SECTION_ENTER: "section:enter",
    SECTION_LEAVE: "section:leave",
    SCROLL_TOP: "scroll:top",
    MEMORY_CHANGED: "memory:changed",
    LEADERBOARD_FOCUS: "leaderboard:focus",
    CLAN_BRANDING_CHANGED: "clan:branding-changed",
    AI_VAULT_CHANGED: "ai:vault-changed",
} as const;

export interface ClanBrandingChangedPayload {
    slug: string;
    iconKind: "builtin" | "image" | null;
    iconValue: string | null;
    color: string | null;
    imageVersion?: number;
}

export { events, AppEvents };
