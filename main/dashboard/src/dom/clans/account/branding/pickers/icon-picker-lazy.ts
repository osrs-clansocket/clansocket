import { type Instance } from "../../../../factory/index.js";

const INITIAL_BATCH = 200;
const SCROLL_BATCH = 200;
const SENTINEL_PX = 200;

export interface LazyRenderHandles {
    debounceHandle: number | null;
    applyFilter(keys: readonly string[]): void;
    dispose(): void;
}

export function setupLazyRender(
    grid: Instance,
    sentinel: Instance,
    loadingMsg: Instance,
    buildNode: (key: string) => Instance<HTMLElement>,
): LazyRenderHandles {
    let visible: readonly string[] = [];
    let rendered = 0;
    let pendingRaf = 0;
    let started = false;

    function renderBatch(count: number): void {
        if (rendered >= visible.length) return;
        const next = Math.min(rendered + count, visible.length);
        const nodes: Instance<HTMLElement>[] = [];
        for (let i = rendered; i < next; i += 1) nodes.push(buildNode(visible[i]!));
        grid.addBatchBefore(nodes, sentinel.el);
        rendered = next;
        sentinel.el.hidden = rendered >= visible.length;
    }

    function scheduleBatch(): void {
        if (pendingRaf !== 0) return;
        pendingRaf = window.requestAnimationFrame(() => {
            pendingRaf = 0;
            renderBatch(SCROLL_BATCH);
        });
    }

    function applyFilter(keys: readonly string[]): void {
        visible = keys;
        rendered = 0;
        if (!started) {
            loadingMsg.destroy();
            started = true;
        }
        grid.setChildren(sentinel);
        renderBatch(INITIAL_BATCH);
    }

    const observer = new IntersectionObserver(
        (records) => {
            for (const r of records)
                if (r.isIntersecting) {
                    scheduleBatch();
                    return;
                }
        },
        { rootMargin: `${SENTINEL_PX}px 0px ${SENTINEL_PX}px 0px` },
    );
    observer.observe(sentinel.el);

    return {
        debounceHandle: null,
        applyFilter,
        dispose(): void {
            if (pendingRaf !== 0) window.cancelAnimationFrame(pendingRaf);
            observer.disconnect();
        },
    };
}
