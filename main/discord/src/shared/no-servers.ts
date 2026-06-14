import type { BotServer } from "../loaders/bot-servers-loader.js";

export function noServers(servers: BotServer[]): boolean {
    return servers.length === 0;
}
