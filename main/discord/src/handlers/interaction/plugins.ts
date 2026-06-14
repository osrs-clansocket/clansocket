import path from "path";
import { fileURLToPath } from "url";
import { createPluginRegistry, INTERACTION_LABELS } from "../plugin/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const interactionPlugins = new Map();

const { load: loadInteractionPlugins, reload: reloadInteractionPlugins } = createPluginRegistry(
    path.join(__dirname, "../../plugins/interactions"),
    interactionPlugins,
    INTERACTION_LABELS,
);

function getLoadedPlugins() {
    return Array.from(interactionPlugins.keys());
}

export { interactionPlugins, loadInteractionPlugins, reloadInteractionPlugins, getLoadedPlugins };
