import { getGlobalPreset } from "./global.js";
import { getOverride } from "./override.js";
import type { PluginPresetSchema } from "../../../../plugin-api/types/client-config.js";

const SCHEMA_VERSION = 1;

export function effectivePresetForMember(clanId: string, accountHash: string): PluginPresetSchema | null {
    const global = getGlobalPreset(clanId);
    if (!global) return null;
    const override = getOverride(clanId, accountHash);
    if (!override) return global.preset;
    return {
        version: SCHEMA_VERSION,
        values: { ...global.preset.values, ...override.preset.values },
    };
}
