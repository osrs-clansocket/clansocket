import type { ChartKind, ChartMount } from "./types";
import { createTimeLine, type TimeLineSpec } from "./kinds/time-line";
import { createBar, type BarSpec } from "./kinds/bar";
import { createDoughnut, type DoughnutSpec } from "./kinds/doughnut";
import { createRadar, type RadarSpec } from "./kinds/radar";
import { createHeatmap, type HeatmapSpec } from "./kinds/heatmap";
import { getMount, destroyMount } from "./registry";

type SpecByKind = {
    "time-line": TimeLineSpec;
    bar: BarSpec;
    doughnut: DoughnutSpec;
    radar: RadarSpec;
    heatmap: HeatmapSpec;
};

type AnySpec = SpecByKind[keyof SpecByKind];

const creators: {
    [K in keyof SpecByKind]: (canvas: HTMLCanvasElement, spec: SpecByKind[K]) => ChartMount;
} = {
    "time-line": createTimeLine,
    bar: createBar,
    doughnut: createDoughnut,
    radar: createRadar,
    heatmap: createHeatmap,
};

function isSupportedKind(kind: ChartKind): kind is keyof SpecByKind {
    return kind in creators;
}

function mount<K extends keyof SpecByKind>(canvas: HTMLCanvasElement, kind: K, spec: SpecByKind[K]): ChartMount {
    return creators[kind](canvas, spec);
}

function unmount(canvas: HTMLCanvasElement): void {
    destroyMount(canvas);
}

function update(canvas: HTMLCanvasElement, next: AnySpec): void {
    const m = getMount(canvas);
    if (m) m.update(next);
}

export { mount, unmount, update, isSupportedKind };
export type { SpecByKind, AnySpec };
