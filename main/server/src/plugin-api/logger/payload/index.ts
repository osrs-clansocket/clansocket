import { COMBAT_FORMATTERS } from "./formatters-combat.js";
import { CONTAINER_FORMATTERS } from "./formatters-containers.js";
import { MOVEMENT_FORMATTERS } from "./formatters-movement.js";
import { PROGRESS_FORMATTERS } from "./formatters-progress.js";
import { SKILL_FORMATTERS } from "./formatters-skills.js";

type Formatter = (data: any) => string;

const REGISTRY: Record<string, Formatter> = {
    ...MOVEMENT_FORMATTERS,
    ...SKILL_FORMATTERS,
    ...CONTAINER_FORMATTERS,
    ...COMBAT_FORMATTERS,
    ...PROGRESS_FORMATTERS,
};

export function formatPayload(type: string, data: any): string {
    if (!data || typeof data !== "object") return "";
    const fn = REGISTRY[type];
    return fn ? fn(data) : "";
}
