import { mountParticles } from "./particles";

const DISPOSED: (() => void) | null = null;

let disposer: (() => void) | null = DISPOSED;

function mount(): void {
    if (disposer) return;
    disposer = mountParticles();
}

function unmount(): void {
    const stop = disposer;
    if (!stop) return;
    stop();
    disposer = DISPOSED;
}

function isMounted(): boolean {
    return Boolean(disposer);
}

export { mount, unmount, isMounted };
