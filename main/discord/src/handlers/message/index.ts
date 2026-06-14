import { loadPlugins, reloadPlugins, getLoadedPlugins } from "./plugins.js";
import { processMessage } from "./executor.js";

await loadPlugins();

export { processMessage, reloadPlugins, getLoadedPlugins };
