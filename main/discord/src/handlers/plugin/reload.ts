import logger from "@clansocket/logger";

async function reloadPluginRegistry(map: any, loader: any, label: any) {
    map.clear();
    await loader();
    logger.info(`Loaded ${map.size} ${label}`);
}

export { reloadPluginRegistry };
