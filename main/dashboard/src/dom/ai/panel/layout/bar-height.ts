const AT_BOTTOM_TOLERANCE_PX = 8;
const EXPANDED_CLASS = "ai-bar--expanded";
const EXPANDED_STORAGE_KEY = "varez_ai_bar_expanded";

function readStoredExpanded(): boolean {
    try {
        return localStorage.getItem(EXPANDED_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

function writeStoredExpanded(expanded: boolean): void {
    try {
        localStorage.setItem(EXPANDED_STORAGE_KEY, expanded ? "1" : "0");
    } catch {
        return;
    }
}

function restoreExpandedState(bar: HTMLElement): void {
    if (readStoredExpanded()) bar.classList.add(EXPANDED_CLASS);
}

function shouldAutoExpand(): boolean {
    try {
        return localStorage.getItem(EXPANDED_STORAGE_KEY) !== "0";
    } catch {
        return true;
    }
}

function isScrolledToBottom(): boolean {
    const el = document.documentElement;
    return el.scrollHeight - window.innerHeight - window.scrollY < AT_BOTTOM_TOLERANCE_PX;
}

function createExpandHandler(bar: HTMLElement): () => void {
    return () => {
        bar.classList.toggle(EXPANDED_CLASS);
        writeStoredExpanded(bar.classList.contains(EXPANDED_CLASS));
    };
}

export { isScrolledToBottom, createExpandHandler, restoreExpandedState, shouldAutoExpand };
