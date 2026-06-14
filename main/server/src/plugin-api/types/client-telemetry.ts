import type { ContainerItem, SkillEntry } from "./shared.js";

export type XpGainedMsg = { type: "xp_gained"; skill: string; xp: number; delta: number };
export type LevelUpMsg = { type: "level_up"; skill: string; level: number };

export type DeathMsg = {
    type: "death";
    x: number;
    y: number;
    plane: number;
    regionId?: number | null;
    regionName?: string | null;
    area?: string | null;
    causeKind?: string | null;
    causeId?: number | null;
    causeName?: string | null;
    causeCategory?: string | null;
    hpBefore?: number | null;
    respawnX?: number | null;
    respawnY?: number | null;
    respawnPlane?: number | null;
    respawnRegionId?: number | null;
};

export type LocationMsg = {
    type: "location";
    x: number;
    y: number;
    plane: number;
    region: number;
    area?: string | null;
};
export type VitalsMsg = {
    type: "vitals";
    energy: number;
    weight: number;
    spec: number;
    hitpoints: number;
    prayer: number;
    maxHitpoints: number;
    maxPrayer: number;
};
export type PrayersMsg = { type: "prayers"; hash: string; active: string[] };
export type StatusEffectMsg = { type: "status_effect"; effect: string; active: boolean };

export type InteractingMsg = {
    type: "interacting";
    targetKind: "NPC" | "PLAYER" | "NONE";
    targetId?: number | null;
    targetName?: string | null;
};

export type StatsMsg = { type: "stats"; hash: string; skills: SkillEntry[] };
export type ContainerMsg = { type: "container"; hash: string; containerId: string; items: ContainerItem[] };
export type ContainerDeltaMsg = {
    type: "container_delta";
    containerId: string;
    changes: { id: number; qty: number; name?: string | null }[];
};
export type WorldHopMsg = { type: "world_hop"; fromWorld: number; toWorld: number };
export type MenuActionMsg = { type: "menu_action"; action: string; option: string; target: string; id: number };

export type BankOpenMsg = { type: "bank_open"; hash: string; items: ContainerItem[] };
export type BankCloseMsg = { type: "bank_close"; hash: string; items: ContainerItem[]; durationMs: number };

export type DamageDealtMsg = {
    type: "damage_dealt";
    amount: number;
    hitsplatType: number;
    hitsplatName?: string | null;
    targetKind: string;
    targetId?: number | null;
    targetName?: string | null;
    attackStyle?: string | null;
};
export type DamageTakenMsg = {
    type: "damage_taken";
    amount: number;
    hitsplatType: number;
    hitsplatName?: string | null;
};
export type LootMsg = {
    type: "loot";
    sourceType: string;
    sourceId?: number | null;
    source?: string | null;
    sourceLevel: number;
    kc?: number | null;
    items: ContainerItem[];
};
export type PetDropMsg = {
    type: "pet_drop";
    trigger: string;
    message: string;
    petName?: string | null;
    petItemId?: number | null;
};
export type BoostsMsg = { type: "boosts"; hash: string; boosts: { skill: string; diff: number }[] };

export type SlayerMsg = {
    type: "slayer";
    hash: string;
    count: number;
    target: number;
    area: number;
    countOriginal: number;
    master: number;
    points: number;
    tasksCompleted: number;
    bossId: number;
    bossName?: string | null;
    wildyTasksCompleted: number;
    masterName?: string | null;
    targetName?: string | null;
    areaName?: string | null;
};

export type RunePouchMsg = {
    type: "rune_pouch";
    hash: string;
    slots: { slot: number; itemId: number; qty: number; name?: string | null }[];
};

export type TelemetryClientMessage =
    | XpGainedMsg
    | LevelUpMsg
    | DeathMsg
    | LocationMsg
    | VitalsMsg
    | PrayersMsg
    | StatusEffectMsg
    | InteractingMsg
    | StatsMsg
    | ContainerMsg
    | ContainerDeltaMsg
    | WorldHopMsg
    | MenuActionMsg
    | BankOpenMsg
    | BankCloseMsg
    | DamageDealtMsg
    | DamageTakenMsg
    | LootMsg
    | PetDropMsg
    | BoostsMsg
    | SlayerMsg
    | RunePouchMsg;
