const DRAG_DATA_TYPE = "application/x-clansocket-tree-node";
const DRAGGING_CLASS = "is-dragging";
const DROP_INTO_CLASS = "is-drop-into";
const DROP_BEFORE_CLASS = "is-drop-before";
const DROP_AFTER_CLASS = "is-drop-after";
const ZONE_BEFORE_FRACTION = 0.33;
const ZONE_AFTER_FRACTION = 0.67;
const HALF = 0.5;

export type DropPosition = "before" | "after" | "into";

export interface DragPayload {
    key: string;
    kind: string;
}

export interface DragSourceOptions {
    key: string;
    kind: string;
    onStart?: () => void;
    onEnd?: () => void;
}

export interface DropTargetOptions {
    accepts: ReadonlySet<string>;
    allowInto?: boolean;
    onDrop: (payload: DragPayload, position: DropPosition) => void;
}

let activeDrag: DragPayload | null = null;

function classForPosition(position: DropPosition): string {
    if (position === "into") return DROP_INTO_CLASS;
    if (position === "before") return DROP_BEFORE_CLASS;
    return DROP_AFTER_CLASS;
}

function clearDropClasses(el: HTMLElement): void {
    el.classList.remove(DROP_INTO_CLASS, DROP_BEFORE_CLASS, DROP_AFTER_CLASS);
}

function computeDropPosition(e: DragEvent, rect: DOMRect, allowInto: boolean): DropPosition {
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    if (!allowInto) return ratio < HALF ? "before" : "after";
    if (ratio < ZONE_BEFORE_FRACTION) return "before";
    if (ratio > ZONE_AFTER_FRACTION) return "after";
    return "into";
}

function handleDragOver(el: HTMLElement, opts: DropTargetOptions, allowInto: boolean, e: DragEvent): void {
    if (activeDrag === null) return;
    if (!opts.accepts.has(activeDrag.kind)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const rect = el.getBoundingClientRect();
    const position = computeDropPosition(e, rect, allowInto);
    clearDropClasses(el);
    el.classList.add(classForPosition(position));
}

function handleDragLeave(el: HTMLElement, e: DragEvent): void {
    const related = e.relatedTarget as Node | null;
    if (related !== null && el.contains(related)) return;
    clearDropClasses(el);
}

function handleDrop(el: HTMLElement, opts: DropTargetOptions, allowInto: boolean, e: DragEvent): void {
    if (activeDrag === null) return;
    if (!opts.accepts.has(activeDrag.kind)) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const position = computeDropPosition(e, rect, allowInto);
    const payload = activeDrag;
    clearDropClasses(el);
    opts.onDrop(payload, position);
}

export function wireDragSource(el: HTMLElement, opts: DragSourceOptions): void {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
        const payload: DragPayload = { key: opts.key, kind: opts.kind };
        activeDrag = payload;
        if (e.dataTransfer) {
            e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(payload));
            e.dataTransfer.effectAllowed = "move";
        }
        el.classList.add(DRAGGING_CLASS);
        opts.onStart?.();
    });
    el.addEventListener("dragend", () => {
        activeDrag = null;
        el.classList.remove(DRAGGING_CLASS);
        opts.onEnd?.();
    });
}

export function wireDropTarget(el: HTMLElement, opts: DropTargetOptions): void {
    const allowInto = opts.allowInto !== false;
    el.addEventListener("dragover", (e) => handleDragOver(el, opts, allowInto, e));
    el.addEventListener("dragleave", (e) => handleDragLeave(el, e));
    el.addEventListener("drop", (e) => handleDrop(el, opts, allowInto, e));
}
