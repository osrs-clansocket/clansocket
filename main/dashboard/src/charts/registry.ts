import type { ChartCanvas, ChartKind, ChartMount } from "./types";

const mounted = new WeakMap<HTMLCanvasElement, ChartMount>();

function discoverCharts(root: ParentNode): ChartCanvas[] {
    const canvases = root.querySelectorAll<HTMLCanvasElement>("canvas[data-chart-kind]");
    const out: ChartCanvas[] = [];
    canvases.forEach((canvas) => {
        const kind = canvas.dataset.chartKind as ChartKind | undefined;
        if (!kind) return;
        out.push({
            canvas,
            kind,
            dataKey: canvas.dataset.chartData ?? "",
            key: canvas.dataset.chartKey ?? "",
        });
    });
    return out;
}

function trackMount(canvas: HTMLCanvasElement, mount: ChartMount): void {
    const existing = mounted.get(canvas);
    if (existing) existing.destroy();
    mounted.set(canvas, mount);
}

function getMount(canvas: HTMLCanvasElement): ChartMount | undefined {
    return mounted.get(canvas);
}

function destroyMount(canvas: HTMLCanvasElement): void {
    const m = mounted.get(canvas);
    if (m) {
        m.destroy();
        mounted.delete(canvas);
    }
}

function destroyAllIn(root: ParentNode): void {
    discoverCharts(root).forEach((c) => destroyMount(c.canvas));
}

export { discoverCharts, trackMount, getMount, destroyMount, destroyAllIn };
