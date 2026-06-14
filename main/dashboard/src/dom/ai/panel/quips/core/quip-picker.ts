import type { Quip, QuipSet } from "./quip-types.js";

export interface QuipTraverser {
    next(): Quip;
}

function shuffleInPlace(arr: Quip[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i]!;
        arr[i] = arr[j]!;
        arr[j] = tmp;
    }
}

export function createQuipTraverser(set: QuipSet): QuipTraverser {
    if (set.length === 0) throw new Error("createQuipTraverser: quip set is empty");
    let shuffled: Quip[] = [...set];
    shuffleInPlace(shuffled);
    let cursor = 0;
    return {
        next: (): Quip => {
            if (cursor >= shuffled.length) {
                shuffled = [...set];
                shuffleInPlace(shuffled);
                cursor = 0;
            }
            const quip = shuffled[cursor]!;
            cursor++;
            return quip;
        },
    };
}
