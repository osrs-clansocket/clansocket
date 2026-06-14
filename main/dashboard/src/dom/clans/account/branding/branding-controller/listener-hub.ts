export class ListenerHub<L> {
    private subs: L[] = [];

    add(l: L): () => void {
        this.subs.push(l);
        return () => {
            const idx = this.subs.indexOf(l);
            if (idx >= 0) this.subs.splice(idx, 1);
        };
    }

    fire(action: (l: L) => void): void {
        for (const s of this.subs) action(s);
    }
}
