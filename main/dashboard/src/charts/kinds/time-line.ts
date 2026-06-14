import type { ChartConfiguration, ChartOptions, TooltipItem } from "chart.js";
import { ensureCoreRegistered, ensureZoomRegistered, Chart } from "../plugins";
import { getChartTheme } from "../theme";
import { dropEmptySeries, timeUnitForWindow, formatNumber } from "../helpers";
import { trackMount } from "../registry";
import type { ChartMount, ChartTheme, TimeLineData } from "../types";
import { ENABLED, DISABLED, ANIM_DURATION } from "./flags";

interface TimeLineSpec {
    data: TimeLineData;
    window?: string;
    minimal?: boolean;
}

const LINE_TYPE = "line" as const;
type LineKind = typeof LINE_TYPE;

const BORDER_WIDTH_FULL = 2;
const BORDER_WIDTH_MIN = 1.5;
const POINT_RADIUS_FULL = 2;
const POINT_HOVER_RADIUS = 4;
const TENSION = 0.25;
const DECIMATION_SAMPLES = 120;
const FILL_TINT = "14";

const STATIC_CHART_OPTS = {
    responsive: DISABLED,
    maintainAspectRatio: DISABLED,
    interaction: { mode: "nearest" as const, axis: "x" as const, intersect: DISABLED },
};

function isMinimal(spec: TimeLineSpec): boolean {
    return spec.minimal === ENABLED;
}

function buildDataset(s: TimeLineData["series"][number], color: string, minimal: boolean) {
    return {
        label: s.label ?? "",
        data: s.points.map((p) => ({ x: p.t as number, y: p.v })),
        borderColor: color,
        backgroundColor: color,
        borderWidth: minimal ? BORDER_WIDTH_MIN : BORDER_WIDTH_FULL,
        pointRadius: minimal ? 0 : POINT_RADIUS_FULL,
        pointHoverRadius: minimal ? 0 : POINT_HOVER_RADIUS,
        tension: TENSION,
        fill: minimal ? { target: "origin" as const, above: `${color}${FILL_TINT}` } : DISABLED,
    };
}

function buildDatasets(spec: TimeLineSpec, palette: string[]) {
    const series = dropEmptySeries(spec.data.series);
    const minimal = isMinimal(spec);
    return series.map((s, i) => buildDataset(s, palette[i % palette.length]!, minimal));
}

function buildAxis(theme: ChartTheme, minimal: boolean) {
    return {
        grid: { display: !minimal, color: theme.grid },
        ticks: { display: !minimal, color: theme.textMuted },
        display: !minimal,
    };
}

function tooltipTitle(items: TooltipItem<LineKind>[]): string {
    const x = items[0]?.parsed?.x;
    return typeof x === "number" ? new Date(x).toLocaleString() : "";
}

function tooltipLabel(item: TooltipItem<LineKind>): string {
    const label = item.dataset.label ? `${item.dataset.label}: ` : "";
    const y = item.parsed.y;
    return `${label}${y == null ? "—" : formatNumber(y)}`;
}

function buildZoomConfig(minimal: boolean) {
    if (minimal) return undefined;
    return {
        pan: { enabled: ENABLED, mode: "x" as const },
        zoom: {
            wheel: { enabled: ENABLED },
            pinch: { enabled: ENABLED },
            mode: "x" as const,
        },
    };
}

function buildPlugins(minimal: boolean) {
    return {
        legend: { display: !minimal },
        tooltip: { enabled: !minimal, callbacks: { title: tooltipTitle, label: tooltipLabel } },
        decimation: { enabled: ENABLED, algorithm: "lttb" as const, samples: DECIMATION_SAMPLES },
        zoom: buildZoomConfig(minimal),
    };
}

function buildOptions(spec: TimeLineSpec, theme: ChartTheme): ChartOptions<LineKind> {
    const minimal = isMinimal(spec);
    const unit = timeUnitForWindow(spec.window ?? "24h");
    return {
        ...STATIC_CHART_OPTS,
        responsive: ENABLED,
        maintainAspectRatio: DISABLED,
        animation: minimal ? DISABLED : { duration: ANIM_DURATION },
        plugins: buildPlugins(minimal),
        scales: {
            x: { type: "time", time: { unit }, ...buildAxis(theme, minimal) },
            y: { ...buildAxis(theme, minimal), beginAtZero: minimal },
        },
    };
}

function buildMount(canvas: HTMLCanvasElement, chart: Chart<LineKind>, theme: ChartTheme): ChartMount {
    const mount: ChartMount = {
        destroy() {
            chart.destroy();
        },
        update(next: unknown) {
            chart.data.datasets = buildDatasets(next as TimeLineSpec, theme.palette);
            chart.update("none");
        },
    };
    trackMount(canvas, mount);
    return mount;
}

function createTimeLine(canvas: HTMLCanvasElement, spec: TimeLineSpec): ChartMount {
    ensureCoreRegistered();
    if (!isMinimal(spec)) ensureZoomRegistered();
    const theme = getChartTheme();
    const config: ChartConfiguration<LineKind> = {
        type: LINE_TYPE,
        data: { datasets: buildDatasets(spec, theme.palette) },
        options: buildOptions(spec, theme),
    };
    const chart = new Chart(canvas, config);
    return buildMount(canvas, chart, theme);
}

export { createTimeLine };
export type { TimeLineSpec };
