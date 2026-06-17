export interface PluginPresetSchema {
    version: number;
    values: Record<string, string | number | boolean>;
}

export type ClanConfigRequestMsg = { type: "clan_config_request" };
