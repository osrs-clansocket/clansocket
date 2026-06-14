import { signal, type ReadSignal } from "../../dom/factory/reactive";

interface RanksState {
    byRsn: Map<string, string | null>;
}

const state = signal<RanksState>({ byRsn: new Map() });

export const ranks$: ReadSignal<RanksState> = state;

export function setRank(rsn: string, rank: string | null): void {
    const cur = state();
    if (cur.byRsn.has(rsn) && cur.byRsn.get(rsn) === rank) return;
    const next = new Map(cur.byRsn);
    next.set(rsn, rank);
    state.set({ byRsn: next });
}

export function setRanks(updates: ReadonlyMap<string, string | null>): void {
    const cur = state();
    let changed = false;
    for (const [rsn, rank] of updates) {
        if (!cur.byRsn.has(rsn) || cur.byRsn.get(rsn) !== rank) {
            changed = true;
            break;
        }
    }
    if (!changed) return;
    const next = new Map(cur.byRsn);
    for (const [rsn, rank] of updates) next.set(rsn, rank);
    state.set({ byRsn: next });
}

export function getRank(rsn: string): string | null {
    return state().byRsn.get(rsn) ?? null;
}
