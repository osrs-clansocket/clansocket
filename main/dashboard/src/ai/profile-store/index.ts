import { coerceFocus, coerceIdentityDelta, coerceSessionEntry } from "./coerce.js";
import { clearStored, readStored, writeStored } from "./storage.js";
import { resolveHistoryWindow } from "./window.js";
import type { ProfileContext, SessionEntry, StoredProfile } from "./types.js";
import { isValidIdentityKey } from "./validation.js";

export type { ProfileContext, SessionEntry } from "./types.js";
export { resolveHistoryWindow } from "./window.js";
export { isReservedIdentityPrefix, isValidIdentityKey } from "./validation.js";

function toContext(s: StoredProfile): ProfileContext {
    const recent = s.session.slice(-resolveHistoryWindow());
    return { identity: s.identity, session: recent, focus: s.focus };
}

function commit(stored: StoredProfile): void {
    stored.updatedAt = Date.now();
    writeStored(stored);
}

function mutate<T>(fn: (s: StoredProfile) => T): T {
    const stored = readStored();
    const result = fn(stored);
    commit(stored);
    return result;
}

function trimSessionLog(stored: StoredProfile): void {
    const window = resolveHistoryWindow();
    if (stored.session.length > window * 2) {
        stored.session = stored.session.slice(-window);
    }
}

export const profileStore = {
    load(): ProfileContext {
        return toContext(readStored());
    },

    applyAiResponse(partial: unknown): ProfileContext {
        const stored = readStored();
        if (!partial || typeof partial !== "object") return toContext(stored);
        const r = partial as Record<string, unknown>;
        const identityDelta = coerceIdentityDelta(r.identity);
        if (identityDelta !== null) {
            for (const [k, v] of Object.entries(identityDelta)) {
                if (v === null) delete stored.identity[k];
                else stored.identity[k] = v;
            }
        }
        const entry = coerceSessionEntry(r.session);
        if (entry !== null) {
            stored.lastTurn += 1;
            stored.session.push({ turn: stored.lastTurn, ...entry });
            trimSessionLog(stored);
        }
        const focus = coerceFocus(r.focus);
        if (focus !== undefined) stored.focus = focus;
        commit(stored);
        return toContext(stored);
    },

    setIdentity(key: string, value: string): boolean {
        if (!isValidIdentityKey(key)) return false;
        mutate((s) => {
            s.identity[key] = value;
        });
        return true;
    },

    renameIdentity(oldKey: string, newKey: string, value: string): boolean {
        if (!isValidIdentityKey(newKey)) return false;
        mutate((s) => {
            if (oldKey !== newKey) delete s.identity[oldKey];
            s.identity[newKey] = value;
        });
        return true;
    },

    removeIdentity(key: string): void {
        mutate((s) => {
            delete s.identity[key];
        });
    },

    renamePrefix(oldPrefix: string, newPrefix: string): boolean {
        if (!isValidIdentityKey(newPrefix)) return false;
        if (oldPrefix === newPrefix) return true;
        const stored = readStored();
        const toRename: [string, string][] = [];
        for (const key of Object.keys(stored.identity)) {
            if (key === oldPrefix) {
                toRename.push([key, newPrefix]);
            } else if (key.startsWith(oldPrefix + ".")) {
                toRename.push([key, newPrefix + key.slice(oldPrefix.length)]);
            }
        }
        if (toRename.length === 0) return false;
        for (const [oldKey, newKey] of toRename) {
            const value = stored.identity[oldKey]!;
            delete stored.identity[oldKey];
            stored.identity[newKey] = value;
        }
        commit(stored);
        return true;
    },

    removePrefix(prefix: string): void {
        const stored = readStored();
        let dirty = false;
        for (const key of Object.keys(stored.identity)) {
            if (key === prefix || key.startsWith(prefix + ".")) {
                delete stored.identity[key];
                dirty = true;
            }
        }
        if (dirty) commit(stored);
    },

    setFocus(value: string | null): void {
        mutate((s) => {
            s.focus = value;
        });
    },

    addSession(entry: Omit<SessionEntry, "turn">): SessionEntry {
        return mutate((s) => {
            s.lastTurn += 1;
            const full: SessionEntry = { turn: s.lastTurn, ...entry };
            s.session.push(full);
            trimSessionLog(s);
            return full;
        });
    },

    updateSession(turn: number, entry: Omit<SessionEntry, "turn">): boolean {
        return mutate((s) => {
            const idx = s.session.findIndex((e) => e.turn === turn);
            if (idx < 0) return false;
            s.session[idx] = { turn, ...entry };
            return true;
        });
    },

    removeSession(turn: number): void {
        mutate((s) => {
            s.session = s.session.filter((e) => e.turn !== turn);
        });
    },

    clear: clearStored,
};
