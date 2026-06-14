import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import logger from "@clansocket/logger";

async function loadPluginsFromDir(dir: string, register: any, label: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        return;
    }
    const files = fs.readdirSync(dir).filter((file: string) => file.endsWith(".ts") || file.endsWith(".js"));
    for (const file of files) {
        try {
            const pluginPath = path.join(dir, file);
            const pluginUrl = pathToFileURL(pluginPath).href;
            const mod: any = await import(pluginUrl);
            register(mod.default ?? mod);
        } catch (loadError: any) {
            logger.error(`Failed to load ${label} ${file}:`, { error: loadError.message });
        }
    }
}

export { loadPluginsFromDir };
