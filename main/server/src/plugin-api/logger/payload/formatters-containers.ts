import {
    EVENT_BANK_CLOSE,
    EVENT_BANK_OPEN,
    EVENT_CONTAINER,
    EVENT_CONTAINER_DELTA,
    EVENT_RUNE_POUCH,
} from "../../event-types.js";
import { ANSI, color } from "../ansi.js";
import { formatDuration, formatNumber } from "../format.js";

type Formatter = (data: any) => string;

const MAX_SHOWN = 12;

export const CONTAINER_FORMATTERS: Record<string, Formatter> = {
    [EVENT_CONTAINER_DELTA]: (data) => {
        const changes: { id: number; qty: number; name?: string | null }[] = Array.isArray(data.changes)
            ? data.changes
            : [];
        if (changes.length === 0) return `${data.containerId} ${color("dim", "(no changes)")}`;
        const fmt = (c: { id: number; qty: number; name?: string | null }) => {
            const name = typeof c.name === "string" && c.name.length > 0 ? c.name : "?";
            const sign = c.qty > 0 ? "+" : "";
            const col = c.qty > 0 ? ANSI.green : ANSI.red;
            return `${col}${sign}${c.qty}${ANSI.reset} ${name}${color("dim", " #" + c.id)}`;
        };
        return `${data.containerId}  ${changes.map(fmt).join(", ")}`;
    },
    [EVENT_CONTAINER]: (data) => {
        const items: { id: number; qty: number; name?: string | null }[] = Array.isArray(data.items) ? data.items : [];
        if (items.length === 0) return `${data.containerId} ${color("dim", "(empty)")}`;
        const fmt = (i: { id: number; qty: number; name?: string | null }) => {
            const hasName = typeof i.name === "string" && i.name.length > 0;
            const name = hasName ? i.name : "?";
            return `#${i.id} ${name} ×${i.qty}`;
        };
        const shown = items.slice(0, MAX_SHOWN).map(fmt).join(", ");
        const overflow = items.length > MAX_SHOWN ? color("dim", ` +${items.length - MAX_SHOWN} more`) : "";
        return `${data.containerId} (${items.length}) [${shown}]${overflow}`;
    },
    [EVENT_BANK_OPEN]: (data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        const totalQty = items.reduce((a: number, i: { qty: number }) => a + (i.qty ?? 0), 0);
        return `${items.length} slots  total_qty=${formatNumber(totalQty)}`;
    },
    [EVENT_BANK_CLOSE]: (data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        const totalQty = items.reduce((a: number, i: { qty: number }) => a + (i.qty ?? 0), 0);
        const ms = Number(data.durationMs ?? 0);
        return `${items.length} slots  total_qty=${formatNumber(totalQty)}  duration=${formatDuration(ms)}`;
    },
    [EVENT_RUNE_POUCH]: (data) => {
        const slots: { slot: number; itemId: number; qty: number; name?: string | null }[] = Array.isArray(data.slots)
            ? data.slots
            : [];
        if (slots.length === 0) return color("dim", "(empty)");
        return slots.map((s) => `#${s.itemId} ${s.name ?? "?"} ×${s.qty}`).join(", ");
    },
};
