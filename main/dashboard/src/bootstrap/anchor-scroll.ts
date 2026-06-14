import { createInstance } from "../dom/factory";
import { scrollToTarget } from "../dom/factory/layout-ops/structural/scroll-to";

const HIGHLIGHT_EFFECT = "highlight-ring";

function findAnchorTarget(e: Event): HTMLElement | undefined {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
    if (!anchor) return undefined;
    const key = anchor.getAttribute("href")!.slice(1);
    if (key.length === 0) return undefined;
    return document.querySelector<HTMLElement>(`[data-key="${key}"]`) ?? undefined;
}

export function handleAnchorClick(e: Event): void {
    const target = findAnchorTarget(e);
    if (target === undefined) return;
    e.preventDefault();
    scrollToTarget(target);
    const inst = createInstance(target);
    inst.removeEffect(HIGHLIGHT_EFFECT);
    void target.offsetWidth;
    inst.addEffect(HIGHLIGHT_EFFECT);
}
