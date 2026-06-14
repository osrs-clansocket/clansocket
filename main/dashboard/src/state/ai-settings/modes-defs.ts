import type { ModeTier } from "../../ai/modes-store/index.js";

export interface ModeConcernDef {
    readonly id: string;
    readonly title: string;
    readonly icon: string;
    readonly tier: ModeTier;
    readonly defaultOpen?: true;
}

const DEFAULT_OPEN = true as const;

export const MODE_CONCERNS: readonly ModeConcernDef[] = [
    { id: "live", title: "Live behaviour", icon: "broadcast", tier: "live", defaultOpen: DEFAULT_OPEN },
    { id: "capabilities", title: "Capabilities", icon: "gear", tier: "capabilities" },
    { id: "personality", title: "Personality", icon: "person-heart", tier: "personality" },
    { id: "operating", title: "Operating modes", icon: "sliders", tier: "operating" },
];
