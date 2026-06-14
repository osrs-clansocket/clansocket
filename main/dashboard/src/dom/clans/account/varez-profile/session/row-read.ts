import { div, span } from "../../../../factory";
import { profileStore, type SessionEntry } from "../../../../../ai/profile-store";
import { ROW_ACTIONS_CLASS, ROW_CLASS, ROW_META_CLASS, getEditing, setEditing } from "../state.js";
import { iconBtn } from "../shared.js";

export function buildSessionRow(entry: SessionEntry, rerender: () => void): HTMLElement {
    const lines = [`#${entry.turn} they: ${entry.they}`, `i: ${entry.i}`];
    if (entry.learned) lines.push(`learned: ${entry.learned}`);
    if (entry.fix) lines.push(`fix: ${entry.fix}`);
    if (entry.failure) lines.push(`failure: ${entry.failure}`);
    return div({ classes: [ROW_CLASS], context: null, meta: null }, [
        span({ classes: [ROW_META_CLASS], text: lines.join(" · "), context: null, meta: null }),
        div({ classes: [ROW_ACTIONS_CLASS], context: null, meta: null }, [
            iconBtn("pencil", "edit", () => {
                setEditing({ kind: "edit-session", turn: entry.turn });
                rerender();
            }),
            iconBtn("trash", "remove", () => {
                profileStore.removeSession(entry.turn);
                const cur = getEditing();
                if (cur?.kind === "edit-session" && cur.turn === entry.turn) setEditing(null);
                rerender();
            }),
        ]),
    ]).el;
}
