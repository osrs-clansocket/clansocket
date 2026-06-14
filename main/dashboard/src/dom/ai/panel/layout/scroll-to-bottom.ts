import { scheduleOp } from "../../../factory";

let pending: HTMLElement | null = null;
let scheduled = false;

function flush(): void {
    scheduled = false;
    const parent = pending;
    pending = null;
    if (parent) parent.scrollTop = parent.scrollHeight;
}

export function scrollToBottomCoalesced(scrollParent: HTMLElement): void {
    pending = scrollParent;
    if (scheduled) return;
    scheduled = true;
    scheduleOp(flush);
}
