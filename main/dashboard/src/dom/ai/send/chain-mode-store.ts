type ChainMode = "reactive" | "continuous";

const KEY = "ai-chain-mode";
const listeners = new Set<(mode: ChainMode) => void>();

function read(): ChainMode {
    try {
        return localStorage.getItem(KEY) === "continuous" ? "continuous" : "reactive";
    } catch {
        return "reactive";
    }
}

function write(mode: ChainMode): void {
    try {
        localStorage.setItem(KEY, mode);
    } catch {
        return;
    }
}

const chainModeStore = {
    get(): ChainMode {
        return read();
    },
    set(mode: ChainMode): void {
        write(mode);
        for (const l of listeners) l(mode);
    },
    toggle(): ChainMode {
        const next: ChainMode = read() === "reactive" ? "continuous" : "reactive";
        this.set(next);
        return next;
    },
    onChange(fn: (mode: ChainMode) => void): () => void {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};

export { chainModeStore };
export type { ChainMode };
