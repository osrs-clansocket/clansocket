const SCROLLABLE_OVERFLOW: ReadonlySet<string> = new Set(["scroll", "auto"]);

function findScrollParent(el: Element): Element {
    let parent = el.parentElement;
    while (parent !== null) {
        if (SCROLLABLE_OVERFLOW.has(getComputedStyle(parent).overflowY)) return parent;
        parent = parent.parentElement;
    }
    return document.documentElement;
}

function chooseScrollBlock(el: Element): ScrollLogicalPosition {
    const scrollParent = findScrollParent(el);
    return el.getBoundingClientRect().height > scrollParent.clientHeight ? "start" : "center";
}

export function scrollToTarget(el: Element): void {
    el.scrollIntoView({ behavior: "smooth", block: chooseScrollBlock(el) });
}
