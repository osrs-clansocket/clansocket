import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";

const SCHEMA_VERSION = 1;

export interface PluginPreset {
    version: number;
    values: Record<string, string | number | boolean>;
}

export interface GlobalPresetRecord {
    preset: PluginPreset;
    updatedAt: number;
    updatedBySiteAccountId: string;
}

export interface OverrideRecord {
    accountHash: string;
    preset: PluginPreset;
    updatedAt: number;
    updatedBySiteAccountId: string;
}

export interface PluginConfigMember {
    accountHash: string;
    rsn: string;
    rank: string | null;
}

export interface PluginConfigState {
    global: GlobalPresetRecord | null;
    overrides: readonly OverrideRecord[];
    members: readonly PluginConfigMember[];
}

const EMPTY_STATE: PluginConfigState = { global: null, overrides: [], members: [] };

async function readJson<T>(res: Response, fallback: T): Promise<T> {
    try {
        return (await res.json()) as T;
    } catch {
        return fallback;
    }
}

export async function fetchPluginConfig(slug: string): Promise<PluginConfigState> {
    const res = await sameOriginFetch(`/api/clans/${encodeURIComponent(slug)}/manage/plugin-config`);
    if (!res.ok) return EMPTY_STATE;
    return readJson<PluginConfigState>(res, EMPTY_STATE);
}

export async function publishGlobalPreset(
    slug: string,
    values: Record<string, string | number | boolean>,
): Promise<boolean> {
    const res = await sameOriginFetch(`/api/clans/${encodeURIComponent(slug)}/manage/plugin-config/global`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: SCHEMA_VERSION, values }),
    });
    return res.ok;
}

export async function clearGlobalPreset(slug: string): Promise<boolean> {
    const res = await sameOriginFetch(`/api/clans/${encodeURIComponent(slug)}/manage/plugin-config/global`, {
        method: "DELETE",
    });
    return res.ok;
}

export async function publishMemberOverride(
    slug: string,
    accountHash: string,
    values: Record<string, string | number | boolean>,
): Promise<boolean> {
    const res = await sameOriginFetch(
        `/api/clans/${encodeURIComponent(slug)}/manage/plugin-config/members/${encodeURIComponent(accountHash)}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ version: SCHEMA_VERSION, values }),
        },
    );
    return res.ok;
}

export async function clearMemberOverride(slug: string, accountHash: string): Promise<boolean> {
    const res = await sameOriginFetch(
        `/api/clans/${encodeURIComponent(slug)}/manage/plugin-config/members/${encodeURIComponent(accountHash)}`,
        { method: "DELETE" },
    );
    return res.ok;
}
