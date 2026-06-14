import { effect, signal, type Signal } from "../../dom/factory/reactive";
import { readStored, writeStored } from "./storage.js";

export function persistedSignal<T>(key: string, initial: T): Signal<T> {
    const stored = readStored<T>(key);
    const sig = signal<T>(stored !== undefined ? stored : initial);
    effect(() => writeStored(key, sig()));
    return sig;
}

export interface PersistedScope {
    boolean(key: string, initial: boolean): Signal<boolean>;
    string(key: string, initial: string): Signal<string>;
    number(key: string, initial: number): Signal<number>;
    json<T>(key: string, initial: T): Signal<T>;
}

export function persistedScope(prefix: string): PersistedScope {
    function k(suffix: string): string {
        return `${prefix}.${suffix}`;
    }
    return {
        boolean: (key, init) => persistedSignal(k(key), init),
        string: (key, init) => persistedSignal(k(key), init),
        number: (key, init) => persistedSignal(k(key), init),
        json: <T>(key: string, init: T) => persistedSignal<T>(k(key), init),
    };
}
