import { readStored, writeStored } from "../../persistence/index.js";

export type RosterView = "grid" | "list";
export type RosterSort = "hierarchy" | "joined";

const VIEW_KEY = "roster-view";
const SORT_KEY = "roster-sort";

export function readView(): RosterView {
    return readStored<RosterView>(VIEW_KEY) === "list" ? "list" : "grid";
}

export function persistView(v: RosterView): void {
    writeStored<RosterView>(VIEW_KEY, v);
}

export function readSort(): RosterSort {
    return readStored<RosterSort>(SORT_KEY) === "joined" ? "joined" : "hierarchy";
}

export function persistSort(v: RosterSort): void {
    writeStored<RosterSort>(SORT_KEY, v);
}
