import { loadInteractionPlugins, reloadInteractionPlugins, getLoadedPlugins } from "./plugins.js";
import { processInteraction } from "./executor.js";

await loadInteractionPlugins();

export { processInteraction, reloadInteractionPlugins, getLoadedPlugins };
