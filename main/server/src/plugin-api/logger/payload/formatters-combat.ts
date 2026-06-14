import { EVENT_DAMAGE_DEALT, EVENT_DAMAGE_TAKEN, EVENT_DEATH, EVENT_LOOT } from "../../event-types.js";
import { color } from "../ansi.js";

type Formatter = (data: any) => string;

export const COMBAT_FORMATTERS: Record<string, Formatter> = {
    [EVENT_DEATH]: (data) => color("dim", `at (${data.x},${data.y},${data.plane})`),
    [EVENT_DAMAGE_DEALT]: (data) => {
        const tgt = data.targetName
            ? `${data.targetName}${data.targetId != null ? color("dim", " #" + data.targetId) : ""}`
            : data.targetKind;
        return `${data.amount} ${color("dim", `type=${data.hitsplatType}`)} → ${tgt}`;
    },
    [EVENT_DAMAGE_TAKEN]: (data) => `${data.amount} ${color("dim", `type=${data.hitsplatType}`)}`,
    [EVENT_LOOT]: (data) => {
        const items: { id: number; qty: number; name?: string | null }[] = Array.isArray(data.items) ? data.items : [];
        const fmt = (i: { id: number; qty: number; name?: string | null }) => {
            const name = typeof i.name === "string" && i.name.length > 0 ? i.name : "?";
            return `#${i.id} ${name} ×${i.qty}`;
        };
        const src = data.source ?? data.lootType;
        const lvl = data.sourceLevel > 0 ? color("dim", ` (lvl ${data.sourceLevel})`) : "";
        return `${color("bold", String(src))}${lvl}  [${items.map(fmt).join(", ")}]`;
    },
};
