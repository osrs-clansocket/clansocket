import type { ChartConfiguration, ChartOptions, TooltipItem } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { ensureCoreRegistered, Chart } from "../plugins";
import { getChartTheme } from "../theme";
import { formatNumber } from "../helpers";
import { trackMount } from "../registry";
import type { ChartMount, ChartTheme } from "../types";
import { ENABLED, DISABLED, ANIM_DURATION } from "./flags";

interface HeatmapCell {
    x: string;
    y: string;
    v: number;
}

interface HeatmapSpec {
    data: HeatmapCell[];
    xLabels: string[];
    yLabels: string[];
    valueLabel?: string;
}

const MATRIX_TYPE = "matrix" as const;
type MatrixKind = typeof MATRIX_TYPE;
const CELL_PADDING = 1;
const MIN_ALPHA = 0.08;
const ALPHA_MAX = 255;
const HEX_BASE = 16;
const HEX_PAD = 2;
const MIN_DIM = 1;

let registered = false;

function ensureMatrixRegistered(): void {
    if (registered) return;
    Chart.register(MatrixController, MatrixElement);
    registered = true;
}

function interpolateColor(color: string, alpha: number): string {
    const clamped = Math.max(MIN_ALPHA, Math.min(MIN_DIM, alpha));
    return `${color}${Math.round(clamped * ALPHA_MAX)
        .toString(HEX_BASE)
        .padStart(HEX_PAD, "0")}`;
}

function tooltipLabel(spec: HeatmapSpec, item: TooltipItem<MatrixKind>): string {
    const raw = item.raw as HeatmapCell;
    const label = spec.valueLabel ? `${spec.valueLabel}: ` : "";
    return `${raw.x} · ${raw.y}: ${label}${formatNumber(raw.v)}`;
}

function buildAxis(theme: ChartTheme, labels: string[], reverse: boolean) {
    return {
        type: "category" as const,
        labels,
        reverse,
        grid: { display: DISABLED },
        ticks: { color: theme.textMuted },
        offset: ENABLED,
    };
}

function buildOptions(spec: HeatmapSpec, theme: ChartTheme): ChartOptions<MatrixKind> {
    return {
        responsive: ENABLED,
        maintainAspectRatio: DISABLED,
        animation: { duration: ANIM_DURATION },
        plugins: {
            legend: { display: DISABLED },
            tooltip: {
                enabled: ENABLED,
                callbacks: {
                    title: () => "",
                    label: (item: TooltipItem<MatrixKind>) => tooltipLabel(spec, item),
                },
            },
        },
        scales: {
            x: buildAxis(theme, spec.xLabels, DISABLED),
            y: buildAxis(theme, spec.yLabels, ENABLED),
        },
    } as unknown as ChartOptions<MatrixKind>;
}

function buildDataset(spec: HeatmapSpec, theme: ChartTheme, max: number) {
    return {
        label: spec.valueLabel ?? "",
        data: spec.data,
        backgroundColor: (ctx: unknown) => {
            const c = (ctx as { raw: HeatmapCell }).raw;
            return interpolateColor(theme.primary, max > 0 ? c.v / max : 0);
        },
        borderColor: "transparent",
        borderWidth: 0,
        width: ({ chart }: { chart: { chartArea?: { width: number } } }) =>
            Math.max(MIN_DIM, (chart.chartArea?.width ?? 0) / Math.max(MIN_DIM, spec.xLabels.length) - CELL_PADDING),
        height: ({ chart }: { chart: { chartArea?: { height: number } } }) =>
            Math.max(MIN_DIM, (chart.chartArea?.height ?? 0) / Math.max(MIN_DIM, spec.yLabels.length) - CELL_PADDING),
    } as unknown as never;
}

function buildConfig(spec: HeatmapSpec, theme: ChartTheme): ChartConfiguration<MatrixKind> {
    const max = spec.data.reduce((m, c) => (c.v > m ? c.v : m), 0);
    return {
        type: MATRIX_TYPE,
        data: { datasets: [buildDataset(spec, theme, max)] },
        options: buildOptions(spec, theme),
    };
}

function buildMount(canvas: HTMLCanvasElement, chart: Chart<MatrixKind>): ChartMount {
    const mount: ChartMount = {
        destroy() {
            chart.destroy();
        },
        update(next: unknown) {
            const nextSpec = next as HeatmapSpec;
            (chart.data.datasets[0] as unknown as { data: HeatmapCell[] }).data = nextSpec.data;
            chart.update("none");
        },
    };
    trackMount(canvas, mount);
    return mount;
}

function createHeatmap(canvas: HTMLCanvasElement, spec: HeatmapSpec): ChartMount {
    ensureCoreRegistered();
    ensureMatrixRegistered();
    const theme = getChartTheme();
    const chart = new Chart(canvas, buildConfig(spec, theme));
    return buildMount(canvas, chart);
}

export { createHeatmap };
export type { HeatmapSpec, HeatmapCell };
