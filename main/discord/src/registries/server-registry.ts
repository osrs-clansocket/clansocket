import { BaseRegistry } from "../base/base-registry.js";
import { resolveServer } from "../loaders/servers-loader.js";
import type { RoutedServer } from "../shared/types/server-types.js";

class ServerRegistry extends BaseRegistry<string, RoutedServer> {
    async load(): Promise<void> {
        return;
    }

    async resolve(guildId: string): Promise<RoutedServer | null> {
        const cached = this.get(guildId);
        if (cached) return cached;
        const fetched = await resolveServer(guildId);
        if (fetched) this.register(guildId, fetched);
        return fetched;
    }

    invalidate(guildId: string): void {
        this.unregister(guildId);
    }
}

export const serverRegistry = new ServerRegistry();
