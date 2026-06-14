import { loadPluginsFromDir } from "./loader.js";
import { reloadPluginRegistry } from "./reload.js";
import { registerByType } from "./register.js";

function buildLabels(key: string, singular: string, plural: string) {
    return Object.freeze({ key, singular, plural });
}

const SLASH_LABELS = buildLabels("slash", "slash plugin", "slash command plugins");
const INTERACTION_LABELS = buildLabels("interaction", "interaction plugin", "interaction plugins");

function createPluginRegistry(
    dir: string,
    registry: Map<string, any>,
    labels: { key: string; singular: string; plural: string },
) {
    const load = async () => {
        await loadPluginsFromDir(dir, registerByType({ [labels.key]: registry }), labels.singular);
    };
    const reload = () => reloadPluginRegistry(registry, load, labels.plural);
    return { load, reload };
}

export { createPluginRegistry, SLASH_LABELS, INTERACTION_LABELS };
