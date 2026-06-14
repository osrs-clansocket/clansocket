export abstract class BaseRegistry<TKey, TValue> {
    protected readonly entries = new Map<TKey, TValue>();

    abstract load(): Promise<void>;

    get(key: TKey): TValue | undefined {
        return this.entries.get(key);
    }

    has(key: TKey): boolean {
        return this.entries.has(key);
    }

    list(): TValue[] {
        return [...this.entries.values()];
    }

    size(): number {
        return this.entries.size;
    }

    register(key: TKey, value: TValue): void {
        this.entries.set(key, value);
    }

    unregister(key: TKey): boolean {
        return this.entries.delete(key);
    }

    clear(): void {
        this.entries.clear();
    }
}
