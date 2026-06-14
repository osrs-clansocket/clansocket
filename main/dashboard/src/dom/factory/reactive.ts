const SIGNAL_BRAND = Symbol.for("lvi.signal");

interface Observer {
    run: () => void;
    deps: Set<Set<Observer>>;
    isMemo: boolean;
    dirty: boolean;
    active: boolean;
    memoSubs: Set<Observer> | null;
    value: unknown;
}

export interface Disposable {
    dispose(): void;
}

export type ReadSignal<T> = {
    (): T;
    readonly [SIGNAL_BRAND]: true;
};

export type Signal<T> = ReadSignal<T> & {
    set(next: T): void;
};

export type ReactiveValue<T> = T | ReadSignal<T>;

let currentObserver: Observer | null = null;

const effectQueue: Observer[] = [];
let flushScheduled = false;

export function isSignal(value: unknown): value is ReadSignal<unknown> {
    if (typeof value !== "function") return false;
    return (value as { [SIGNAL_BRAND]?: true })[SIGNAL_BRAND] === true;
}

function brand<T extends object>(target: T): T & { [SIGNAL_BRAND]: true } {
    Object.defineProperty(target, SIGNAL_BRAND, { value: true });
    return target as T & { [SIGNAL_BRAND]: true };
}

function track(subscribers: Set<Observer>): void {
    if (currentObserver === null) return;
    subscribers.add(currentObserver);
    currentObserver.deps.add(subscribers);
}

function markDownstream(subscribers: Set<Observer>): void {
    for (const o of [...subscribers]) {
        if (o.dirty) continue;
        o.dirty = true;
        if (o.isMemo && o.memoSubs !== null) markDownstream(o.memoSubs);
        else effectQueue.push(o);
    }
}

function scheduleFlush(): void {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(flushEffects);
}

function flushEffects(): void {
    flushScheduled = false;
    while (effectQueue.length > 0) {
        const batch = effectQueue.splice(0);
        for (const o of batch) {
            if (!o.dirty || !o.active) continue;
            o.dirty = false;
            o.run();
        }
    }
}

export function signal<T>(initial: T): Signal<T> {
    let value = initial;
    const subscribers = new Set<Observer>();
    const read = brand((): T => {
        track(subscribers);
        return value;
    }) as Signal<T>;
    read.set = (next: T): void => {
        if (Object.is(value, next)) return;
        value = next;
        markDownstream(subscribers);
        scheduleFlush();
    };
    return read;
}

export function effect(fn: () => void): Disposable {
    const e: Observer = {
        deps: new Set(),
        isMemo: false,
        dirty: false,
        active: true,
        memoSubs: null,
        value: undefined,
        run: (): void => {
            if (!e.active) return;
            for (const dep of e.deps) dep.delete(e);
            e.deps.clear();
            const prev = currentObserver;
            currentObserver = e;
            try {
                fn();
            } finally {
                currentObserver = prev;
            }
        },
    };
    e.run();
    return {
        dispose: (): void => {
            e.active = false;
            for (const dep of e.deps) dep.delete(e);
            e.deps.clear();
        },
    };
}

export function derived<T>(fn: () => T): ReadSignal<T> {
    const memo: Observer = {
        deps: new Set(),
        isMemo: true,
        dirty: true,
        active: true,
        memoSubs: new Set(),
        value: undefined,
        run: (): void => {
            for (const dep of memo.deps) dep.delete(memo);
            memo.deps.clear();
            const prev = currentObserver;
            currentObserver = memo;
            try {
                memo.value = fn();
            } finally {
                currentObserver = prev;
            }
        },
    };
    return brand((): T => {
        if (memo.dirty) {
            memo.dirty = false;
            memo.run();
        }
        if (memo.memoSubs !== null) track(memo.memoSubs);
        return memo.value as T;
    }) as ReadSignal<T>;
}

export function snapshot<T>(value: T): T {
    return value;
}

export interface EffectOwner {
    trackDispose(d: Disposable): void;
}
