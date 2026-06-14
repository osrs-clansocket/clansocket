import { button, createInstance, div, type Instance } from "../../factory";
import { addChainEvent } from "../chain-events";
import { addMessage } from "./messages";
import { setDynProp } from "../../../state/dynamic-styles.js";

const OVERSCAN_PX = 800;
const EST_ROW_PX = 72;
const INITIAL_WINDOW = 10;
const PAGE_SIZE = 10;
const ROW_CLASS = "ai-bar__row";
const SPACER_CLASS = "ai-bar__spacer";
const LOAD_MORE_CLASS = "ai-bar__load-more";
const HISTORY_SELECTOR = ".ai-bar__history";
const MSG_USER = "user" as const;
const MSG_AI = "ai" as const;

interface DisplayItem {
    role: string;
    content: string;
    raw?: string;
    events?: { type: string; payload: Record<string, unknown> }[];
    deepLink?: string;
}

interface WindowState {
    history: DisplayItem[];
    fullHistory: DisplayItem[];
    visibleCount: number;
    heights: number[];
    rows: Map<number, HTMLElement>;
    messages: HTMLElement;
    scroller: HTMLElement;
    topSpacer: HTMLElement;
    bottomSpacer: HTMLElement;
    loadMoreBtn: HTMLElement;
    rafPending: boolean;
}

function replay(target: HTMLElement, item: DisplayItem): void {
    const events = item.events;
    if (events) {
        for (const e of events) addChainEvent(target, e.type, e.payload);
    }
    if (item.content) {
        addMessage({
            containerEl: target,
            text: item.content,
            type: item.role === MSG_USER ? MSG_USER : MSG_AI,
            raw: item.raw,
            deepLink: item.deepLink,
        });
    }
}

function buildRow(item: DisplayItem): HTMLElement {
    const row = div({ classes: [ROW_CLASS], context: null, meta: null });
    replay(row.el, item);
    return row.el;
}

function sumHeights(state: WindowState, from: number, to: number): number {
    let total = 0;
    for (let i = from; i < to; i++) total += state.heights[i] ?? EST_ROW_PX;
    return total;
}

function computeRange(state: WindowState): { start: number; end: number } {
    const top = state.scroller.scrollTop - OVERSCAN_PX;
    const bottom = state.scroller.scrollTop + state.scroller.clientHeight + OVERSCAN_PX;
    const len = state.history.length;
    let acc = 0;
    let start = 0;
    while (start < len && acc + (state.heights[start] ?? EST_ROW_PX) < top) {
        acc += state.heights[start] ?? EST_ROW_PX;
        start++;
    }
    let end = start;
    let visible = acc;
    while (end < len && visible < bottom) {
        visible += state.heights[end] ?? EST_ROW_PX;
        end++;
    }
    return { start, end };
}

function setSpacer(el: HTMLElement, px: number): void {
    setDynProp(el, "block-size", `${Math.max(0, Math.round(px))}px`);
}

function renderWindow(state: WindowState): void {
    const { start, end } = computeRange(state);
    for (const [idx, el] of state.rows) {
        if (idx < start || idx >= end) {
            createInstance(el).destroy();
            state.rows.delete(idx);
        }
    }
    const host = createInstance(state.messages);
    for (let i = start; i < end; i++) {
        if (state.rows.has(i)) continue;
        const row = buildRow(state.history[i]!);
        let ref: Node = state.bottomSpacer;
        for (let j = i + 1; j < end; j++) {
            const existing = state.rows.get(j);
            if (existing) {
                ref = existing;
                break;
            }
        }
        host.addBefore(row, ref);
        state.rows.set(i, row);
    }
    const beforeTop = sumHeights(state, 0, start);
    setSpacer(state.topSpacer, beforeTop);
    setSpacer(state.bottomSpacer, sumHeights(state, end, state.history.length));
    for (let i = start; i < end; i++) {
        const el = state.rows.get(i);
        if (!el) continue;
        const h = el.offsetHeight;
        if (h > 0 && h !== state.heights[i]) state.heights[i] = h;
    }
    const correctedTop = sumHeights(state, 0, start);
    if (correctedTop !== beforeTop) setSpacer(state.topSpacer, correctedTop);
}

function scheduleRender(state: WindowState): void {
    if (state.rafPending) return;
    state.rafPending = true;
    requestAnimationFrame(() => {
        state.rafPending = false;
        renderWindow(state);
    });
}

function buildSpacer(): Instance {
    return div({ classes: [SPACER_CLASS], context: null, meta: null });
}

function updateLoadMoreVisibility(state: WindowState): void {
    state.loadMoreBtn.hidden = state.visibleCount >= state.fullHistory.length;
}

function expandWindow(state: WindowState): void {
    if (state.visibleCount >= state.fullHistory.length) return;
    const newCount = Math.min(state.visibleCount + PAGE_SIZE, state.fullHistory.length);
    const shift = newCount - state.visibleCount;
    state.visibleCount = newCount;
    const shifted = new Map<number, HTMLElement>();
    for (const [idx, el] of state.rows) shifted.set(idx + shift, el);
    state.rows = shifted;
    state.heights = new Array<number>(shift).fill(EST_ROW_PX).concat(state.heights);
    const newSlice = state.fullHistory.slice(-newCount);
    state.history.length = 0;
    for (const item of newSlice) state.history.push(item);
    updateLoadMoreVisibility(state);
    renderWindow(state);
}

const scrollHandlers = new WeakMap<HTMLElement, EventListener>();

function renderRecent(messages: HTMLElement, fullHistory: DisplayItem[]): void {
    const host = createInstance(messages);
    host.clear();
    const scroller = messages.closest<HTMLElement>(HISTORY_SELECTOR) ?? messages;
    const visibleCount = Math.min(INITIAL_WINDOW, fullHistory.length);
    const initialSlice = fullHistory.slice(-visibleCount);
    const topSpacer = buildSpacer();
    const bottomSpacer = buildSpacer();
    const stateRef: { current: WindowState | null } = { current: null };
    const loadMoreBtn = button({
        classes: [LOAD_MORE_CLASS],
        text: "Load older messages",
        context: "expand history window to show older messages",
        meta: ["action"],
        onClick: () => {
            if (stateRef.current) expandWindow(stateRef.current);
        },
    });
    const state: WindowState = {
        history: [...initialSlice],
        fullHistory,
        visibleCount,
        heights: initialSlice.map(() => EST_ROW_PX),
        rows: new Map(),
        messages,
        scroller,
        topSpacer: topSpacer.el,
        bottomSpacer: bottomSpacer.el,
        loadMoreBtn: loadMoreBtn.el,
        rafPending: false,
    };
    stateRef.current = state;
    host.addChild(loadMoreBtn);
    host.addChild(topSpacer);
    host.addChild(bottomSpacer);
    updateLoadMoreVisibility(state);
    const prev = scrollHandlers.get(scroller);
    if (prev) scroller.removeEventListener("scroll", prev);
    const handler: EventListener = () => scheduleRender(state);
    scroller.addEventListener("scroll", handler, { passive: true });
    scrollHandlers.set(scroller, handler);
    setSpacer(bottomSpacer.el, sumHeights(state, 0, state.history.length));
    renderWindow(state);
    scroller.scrollTop = scroller.scrollHeight;
    renderWindow(state);
}

export { renderRecent };
export type { DisplayItem };
