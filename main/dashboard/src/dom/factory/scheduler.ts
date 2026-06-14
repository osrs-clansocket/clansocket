import { isHidden } from "../../managers/raf.js";
import { trustHTML } from "./core/trust-html.js";

export type OpLane = "animation" | "deferred" | "idle";

export interface SchedulerCounters {
    frameMs: number;
    commitSize: number;
    queueDepth: number;
    slicedCommits: number;
}

const FRAME_BUDGET_MS = 8;
const IDLE_TIMEOUT_MS = 200;

const measureQueue: Array<() => void> = [];
const textQueue = new Map<HTMLElement, string>();
const htmlQueue = new Map<HTMLElement, string>();
const attrQueue = new Map<HTMLElement, Map<string, string | null>>();
const animationOps: Array<() => void> = [];
const deferredOps: Array<() => void> = [];
const idleOps: Array<() => void> = [];

let scheduled = false;
let flushing = false;
let rafHandle = 0;
let idleScheduled = false;
let visibilityBound = false;

const counters: SchedulerCounters = { frameMs: 0, commitSize: 0, queueDepth: 0, slicedCommits: 0 };

function clock(): number {
    return performance.now();
}

function pendingCount(): number {
    return (
        measureQueue.length +
        textQueue.size +
        htmlQueue.size +
        attrQueue.size +
        animationOps.length +
        deferredOps.length
    );
}

function onVisibilityChange(): void {
    if (!isHidden() && pendingCount() > 0) ensureScheduled();
}

function bindVisibility(): void {
    if (visibilityBound || typeof document === "undefined") return;
    visibilityBound = true;
    document.addEventListener("visibilitychange", onVisibilityChange);
}

function ensureScheduled(): void {
    bindVisibility();
    if (scheduled || flushing) return;
    scheduled = true;
    rafHandle = requestAnimationFrame(onFrame);
}

function onFrame(): void {
    scheduled = false;
    if (isHidden()) return;
    flush(true);
}

function onIdle(deadline: IdleDeadline): void {
    idleScheduled = false;
    while (idleOps.length > 0 && deadline.timeRemaining() > 0) {
        const op = idleOps.shift();
        if (op) op();
    }
    if (idleOps.length > 0) ensureIdleScheduled();
}

function ensureIdleScheduled(): void {
    if (idleScheduled || idleOps.length === 0) return;
    if (typeof requestIdleCallback === "undefined") {
        deferredOps.push(...idleOps.splice(0));
        ensureScheduled();
        return;
    }
    idleScheduled = true;
    requestIdleCallback(onIdle, { timeout: IDLE_TIMEOUT_MS });
}

function flushMeasure(): void {
    if (measureQueue.length === 0) return;
    const fns = measureQueue.splice(0);
    for (const fn of fns) fn();
}

function flushTextWrites(): void {
    for (const [el, value] of textQueue) el.textContent = value;
    textQueue.clear();
}

function flushHtmlWrites(): void {
    for (const [el, value] of htmlQueue) el.innerHTML = trustHTML(value) as string;
    htmlQueue.clear();
}

function flushAttrWrites(): void {
    for (const [el, attrs] of attrQueue) {
        for (const [name, value] of attrs) {
            if (value === null) el.removeAttribute(name);
            else el.setAttribute(name, value);
        }
    }
    attrQueue.clear();
}

function drainOps(queue: Array<() => void>, deadline: number): number {
    let count = 0;
    while (queue.length > 0 && clock() < deadline) {
        const op = queue.shift();
        if (op) {
            op();
            count++;
        }
    }
    return count;
}

function flushOps(budgeted: boolean): number {
    const deadline = budgeted ? clock() + FRAME_BUDGET_MS : Number.POSITIVE_INFINITY;
    let count = drainOps(animationOps, deadline);
    count += drainOps(deferredOps, deadline);
    if (budgeted && animationOps.length + deferredOps.length > 0) {
        counters.slicedCommits++;
        ensureScheduled();
    }
    return count;
}

function flush(budgeted: boolean): void {
    flushing = true;
    const start = clock();
    try {
        flushMeasure();
        const writes = textQueue.size + htmlQueue.size + attrQueue.size;
        flushTextWrites();
        flushHtmlWrites();
        flushAttrWrites();
        counters.commitSize = writes + flushOps(budgeted);
    } finally {
        flushing = false;
        counters.frameMs = clock() - start;
        counters.queueDepth = pendingCount();
    }
}

export function scheduleMeasure(fn: () => void): void {
    measureQueue.push(fn);
    ensureScheduled();
}

export function scheduleText(el: HTMLElement, value: string): void {
    textQueue.set(el, value);
    ensureScheduled();
}

export function scheduleHtml(el: HTMLElement, value: string): void {
    htmlQueue.set(el, value);
    ensureScheduled();
}

export function scheduleAttr(el: HTMLElement, name: string, value: string | null): void {
    let bucket = attrQueue.get(el);
    if (!bucket) {
        bucket = new Map();
        attrQueue.set(el, bucket);
    }
    bucket.set(name, value);
    ensureScheduled();
}

export function scheduleOp(op: () => void, lane: OpLane = "animation"): void {
    if (lane === "idle") {
        idleOps.push(op);
        ensureIdleScheduled();
        return;
    }
    if (lane === "deferred") deferredOps.push(op);
    else animationOps.push(op);
    ensureScheduled();
}

export function flushSync(): void {
    if (scheduled) {
        cancelAnimationFrame(rafHandle);
        scheduled = false;
    }
    if (flushing) return;
    flush(false);
}

export function isFlushing(): boolean {
    return flushing;
}

export function getSchedulerCounters(): SchedulerCounters {
    return { ...counters };
}
