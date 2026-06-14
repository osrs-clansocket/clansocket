import type { Instance } from "../core";
import { scheduleOp } from "../scheduler";
import type { LiveChange, LiveRow, LiveStore } from "./live-store";

export type LiveViewMode = "cold" | "streaming" | "catch-up";

export interface LiveViewConfig<Row extends LiveRow> {
    container: Instance;
    store: LiveStore<Row>;
    mountRow: (row: Row) => Instance;
    patchRow: (inst: Instance, row: Row) => void;
    mode?: LiveViewMode;
}

export interface LiveViewHandle {
    start(): void;
    teardown(): void;
    freeze(key: string): void;
    unfreeze(key: string): void;
}

const KEY_ATTR = "data-live-key";

export function liveView<Row extends LiveRow>(config: LiveViewConfig<Row>): LiveViewHandle {
    const { container, store, mountRow, patchRow } = config;
    const mounted = new Map<string, Instance>();
    const frozen = new Set<string>();
    const frozenBuffer = new Map<string, Row>();
    let offChange: (() => void) | null = null;
    let started = false;

    function keyOfTarget(el: Element | null): string | null {
        return el?.closest(`[${KEY_ATTR}]`)?.getAttribute(KEY_ATTR) ?? null;
    }

    function freeze(k: string): void {
        frozen.add(k);
    }

    function unfreeze(k: string): void {
        if (!frozen.delete(k)) return;
        const buffered = frozenBuffer.get(k);
        const inst = mounted.get(k);
        if (buffered !== undefined && inst) patchRow(inst, buffered);
        frozenBuffer.delete(k);
    }

    function onOver(e: Event): void {
        const k = keyOfTarget(e.target as Element);
        if (k !== null) freeze(k);
    }

    function onOut(e: Event): void {
        const k = keyOfTarget(e.target as Element);
        if (k !== null) unfreeze(k);
    }

    function mount(k: string, row: Row): Instance {
        const inst = mountRow(row);
        inst.el.setAttribute(KEY_ATTR, k);
        mounted.set(k, inst);
        return inst;
    }

    function patch(k: string, row: Row): void {
        const inst = mounted.get(k);
        if (!inst) return;
        if (frozen.has(k)) {
            frozenBuffer.set(k, row);
            return;
        }
        patchRow(inst, row);
    }

    function remove(k: string): void {
        mounted.get(k)?.destroy();
        mounted.delete(k);
        frozen.delete(k);
        frozenBuffer.delete(k);
    }

    function reorder(): void {
        const parent = container.el;
        let nextEl: ChildNode | null = parent.firstChild;
        for (const k of store.keys()) {
            const inst = mounted.get(k);
            if (!inst) continue;
            if (inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
            else parent.insertBefore(inst.el, nextEl);
        }
    }

    function applyChange(change: LiveChange): void {
        for (const k of change.removed) remove(k);
        for (const k of change.changed) {
            const row = store.get(k);
            if (row === undefined) continue;
            if (mounted.has(k)) patch(k, row);
            else mount(k, row).mount(container.el);
        }
        reorder();
    }

    function bulkMount(): void {
        for (const k of store.keys()) {
            if (mounted.has(k)) continue;
            const row = store.get(k);
            if (row !== undefined) mount(k, row).mount(container.el);
        }
        reorder();
    }

    function bindHover(): void {
        container.el.addEventListener("pointerover", onOver);
        container.el.addEventListener("pointerout", onOut);
        container.el.addEventListener("focusin", onOver);
        container.el.addEventListener("focusout", onOut);
    }

    function unbindHover(): void {
        container.el.removeEventListener("pointerover", onOver);
        container.el.removeEventListener("pointerout", onOut);
        container.el.removeEventListener("focusin", onOver);
        container.el.removeEventListener("focusout", onOut);
    }

    return {
        start(): void {
            if (started) return;
            started = true;
            bindHover();
            offChange = store.onChange((change) => scheduleOp(() => applyChange(change)));
            store.start();
            scheduleOp(bulkMount);
        },
        teardown(): void {
            offChange?.();
            offChange = null;
            unbindHover();
            for (const inst of mounted.values()) inst.destroy();
            mounted.clear();
            frozen.clear();
            frozenBuffer.clear();
            store.teardown();
            started = false;
        },
        freeze,
        unfreeze,
    };
}
