import path from "path";
import { fileURLToPath } from "url";
import { loadPluginsFromDir } from "../plugin/loader.js";
import { registerByType } from "../plugin/register.js";
import logger from "@clansocket/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messagePlugins = new Map();
const commandPlugins = new Map();
const register = registerByType({ message: messagePlugins, command: commandPlugins });

async function loadPlugins() {
    await loadPluginsFromDir(path.join(__dirname, "../../plugins/messages"), register, "message plugin");
    await loadPluginsFromDir(path.join(__dirname, "../../plugins/commands"), register, "command plugin");
}

async function reloadPlugins() {
    messagePlugins.clear();
    commandPlugins.clear();
    await loadPlugins();
    logger.info(`Loaded ${messagePlugins.size} message plugins and ${commandPlugins.size} command plugins`);
}

function getLoadedPlugins() {
    return {
        messages: Array.from(messagePlugins.keys()),
        commands: Array.from(commandPlugins.keys()),
    };
}

export { messagePlugins, commandPlugins, loadPlugins, reloadPlugins, getLoadedPlugins };
