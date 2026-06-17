import { Events, type Client } from "discord.js";
import logger from "@clansocket/logger";
import { BaseRegistry } from "../base/base-registry.js";
import { applyPresence } from "../core/presence.js";
import { syncEmojis } from "../emojis/sync.js";
import { createBotClient } from "../factories/client-factory.js";
import { registerEventHandlers } from "../handlers/command.js";
import { wireAllGatewayListeners } from "../handlers/gateway/index.js";
import { loadBots } from "../loaders/bots-loader.js";
import { loadBotServers } from "../loaders/bot-servers-loader.js";
import { drainPending } from "../outbound/dispatcher.js";
import { startOutboundSubscription } from "../outbound/subscriber.js";
import { drainPublishQueue } from "../publish-queue/dispatcher.js";
import { registerAllPublishHandlers } from "../publish-queue/handlers/index.js";
import { startPublishQueueSubscription } from "../publish-queue/subscriber.js";
import { publishSlashCommands } from "../publishers/slash-publisher.js";
import { noServers } from "../shared/no-servers.js";
import type { BotIdentity, BotState } from "../shared/types/bot-types.js";
import { syncChannelsAndRolesForAllGuilds } from "../state-sync/ready-sync.js";
import { startBotsWatcher } from "../watchers/bots-watcher.js";

async function publishSlashForAllGuilds(identity: BotIdentity): Promise<void> {
    const servers = await loadBotServers(identity.bot_id);
    if (noServers(servers)) {
        logger.info(`No installed guilds for bot ${identity.bot_id}; skipping slash registration`);
        return;
    }
    for (const server of servers) {
        await publishSlashCommands(identity, server.guild_id);
    }
    logger.info(`Slash commands registered for ${servers.length} guild(s) (bot=${identity.bot_id})`);
}

async function subscribePublishQueueForAllGuilds(identity: BotIdentity, client: Client): Promise<void> {
    const servers = await loadBotServers(identity.bot_id);
    if (noServers(servers)) return;
    for (const server of servers) {
        startPublishQueueSubscription(server.clan_id, server.guild_id, client);
        await drainPublishQueue(server.clan_id, server.guild_id, client);
    }
    logger.info(`Publish-queue subscribed for ${servers.length} guild(s) (bot=${identity.bot_id})`);
}

async function startBot(identity: BotIdentity): Promise<BotState> {
    const client = createBotClient(identity);
    client.once(Events.ClientReady, async () => {
        try {
            registerEventHandlers(client, identity);
            wireAllGatewayListeners(client);
            await publishSlashForAllGuilds(identity);
            await applyPresence(client, identity);
            startOutboundSubscription(identity.bot_id, client);
            await drainPending(identity.bot_id, client);
            await subscribePublishQueueForAllGuilds(identity, client);
            await syncChannelsAndRolesForAllGuilds(identity, client);
            await syncEmojis(identity);
            logger.info(`Logged in as ${client.user!.tag} (bot_id=${identity.bot_id})`);
        } catch (err) {
            logger.error(`Bot init failed for ${identity.bot_id}: ${(err as Error).message}`);
            process.exit(1);
        }
    });
    await client.login(identity.token);
    return { identity, client };
}

class BotRegistry extends BaseRegistry<string, BotState> {
    async load(): Promise<void> {
        const identities = await loadBots();
        for (const identity of identities) {
            const state = await startBot(identity);
            this.register(identity.bot_id, state);
        }
        logger.info(`BotRegistry initialized with ${this.size()} bot(s)`);
    }

    private async spawnNewBots(fresh: readonly BotIdentity[]): Promise<number> {
        let spawned = 0;
        for (const identity of fresh) {
            if (this.has(identity.bot_id)) continue;
            try {
                const state = await startBot(identity);
                this.register(identity.bot_id, state);
                spawned++;
                logger.info(`Hot-spawned new bot ${identity.bot_id}`);
            } catch (err) {
                logger.warn(`Hot-spawn failed for ${identity.bot_id}: ${(err as Error).message}`);
            }
        }
        return spawned;
    }

    private async tearDownRemovedBots(freshIds: ReadonlySet<string>): Promise<number> {
        let removed = 0;
        for (const [botId, state] of this.entries) {
            if (freshIds.has(botId)) continue;
            try {
                await state.client.destroy();
            } catch (err) {
                logger.warn(`Bot ${botId} destroy failed: ${(err as Error).message}`);
            }
            this.unregister(botId);
            removed++;
            logger.info(`Tore down removed bot ${botId}`);
        }
        return removed;
    }

    async reconcile(): Promise<void> {
        const fresh = await loadBots();
        const freshIds = new Set(fresh.map((b) => b.bot_id));
        const spawned = await this.spawnNewBots(fresh);
        const removed = await this.tearDownRemovedBots(freshIds);
        if (spawned > 0 || removed > 0) {
            logger.info(`BotRegistry reconciled: +${spawned} -${removed} (size=${this.size()})`);
        }
    }
}

export const botRegistry = new BotRegistry();

export async function initBotRegistry(): Promise<void> {
    registerAllPublishHandlers();
    await botRegistry.load();
    startBotsWatcher();
    logger.info("BotRegistry watcher started -- bot identities now hot-reload on insert/invalidate");
}
