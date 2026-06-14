import { setDynProp } from "../dynamic-styles.js";

export function wireChromeOffsets(rootEl: HTMLElement): () => void {
    const syncChromeOffsets = (): void => {
        const headerEl = document.querySelector<HTMLElement>(".dashboard__header");
        const aiBarEl = document.querySelector<HTMLElement>(".ai-bar");
        if (headerEl) setDynProp(rootEl, "--data-rights-top", `${headerEl.offsetHeight}px`);
        if (aiBarEl) setDynProp(rootEl, "--data-rights-bottom", `${aiBarEl.offsetHeight}px`);
    };
    queueMicrotask(syncChromeOffsets);
    window.addEventListener("resize", syncChromeOffsets);
    const observer = new ResizeObserver(syncChromeOffsets);
    const aiBarEl = document.querySelector<HTMLElement>(".ai-bar");
    if (aiBarEl) observer.observe(aiBarEl);
    const headerEl = document.querySelector<HTMLElement>(".dashboard__header");
    if (headerEl) observer.observe(headerEl);
    return () => {
        window.removeEventListener("resize", syncChromeOffsets);
        observer.disconnect();
    };
}
