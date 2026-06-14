import {
    EVENT_INTERACTING,
    EVENT_LOCATION,
    EVENT_LOGIN_STATE,
    EVENT_MENU_ACTION,
    EVENT_PRAYERS,
    EVENT_STATUS_EFFECT,
    EVENT_VITALS,
    EVENT_WORLD_HOP,
} from "../../event-types.js";
import { ANSI, color } from "../ansi.js";

type Formatter = (data: any) => string;

export const MOVEMENT_FORMATTERS: Record<string, Formatter> = {
    [EVENT_LOCATION]: (data) => {
        const area = data.area ? color("bold", data.area) + " " : "";
        return area + color("dim", `(${data.x},${data.y},${data.plane}) region=${data.region}`);
    },
    [EVENT_VITALS]: (data) => color("dim", `energy=${data.energy}  weight=${data.weight}  spec=${data.spec}`),
    [EVENT_PRAYERS]: (data) => {
        const active: string[] = Array.isArray(data.active) ? data.active : [];
        return active.length === 0 ? color("dim", "none") : `[${active.join(", ")}]`;
    },
    [EVENT_STATUS_EFFECT]: (data) =>
        `${data.effect}=${data.active ? ANSI.red + "ON" + ANSI.reset : ANSI.dim + "off" + ANSI.reset}`,
    [EVENT_INTERACTING]: (data) => {
        if (data.targetKind === "NONE") return color("dim", "none");
        if (data.targetName) {
            return `${data.targetKind} ${color("bold", data.targetName)}${data.targetId != null ? color("dim", " id=" + data.targetId) : ""}`;
        }
        return `${data.targetKind}${data.targetId != null ? " id=" + data.targetId : ""}`;
    },
    [EVENT_WORLD_HOP]: (data) => `${data.fromWorld} ${ANSI.brightYellow}→${ANSI.reset} ${data.toWorld}`,
    [EVENT_LOGIN_STATE]: (data) => `${color("bold", data.state)}`,
    [EVENT_MENU_ACTION]: (data) =>
        `${color("bold", data.option ?? "?")} ${color("dim", "→")} ${data.target ?? "?"} ${color("dim", `[${data.action}${data.id != null ? " id=" + data.id : ""}]`)}`,
};
