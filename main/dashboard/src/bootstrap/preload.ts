import { preloadIcons } from "../icons/providers";

const PRELOAD_DELAY_MS = 500;

export function schedulePreload(): void {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (typeof ric === "function") ric(() => preloadIcons());
    else window.setTimeout(() => preloadIcons(), PRELOAD_DELAY_MS);
}

export function cleanupServiceWorker(): void {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
        runCleanup().catch(() => undefined);
    });
}

async function runCleanup(): Promise<void> {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
}
