import type { ChartConfiguration, ChartOptions, TooltipItem } from "chart.js";
import { ensureCoreRegistered, Chart } from "../plugins";
import { getChartTheme } from "../theme";
import { formatNumber } from "../helpers";
import { trackMount } from "../registry";
import type { ChartMount, ChartTheme } from "../types";
import { ENABLED, DISABLED, ANIM_DURATION, ZERO_BAR_LENGTH } from "./flags";

interface BarDatum {
    label: string;
    value: number;
}

interface BarSpec {
    data: BarDatum[];
    indexAxis?: "x" | "y";
    valueLabel?: string;
}

const BAR_TYPE = "bar" as const;
type BarKind = typeof BAR_TYPE;
const INDEX_AXIS_HORIZONTAL = "y" as const;
const BAR_THICKNESS = 14;
const BAR_RADIUS = 4;

const STATIC_BAR_OPTS = {
    responsive: ENABLED,
    maintainAspectRatio: DISABLED,
    animation: { duration: ANIM_DURATION },
};

function colorForValue(theme: ChartTheme, value: number): string {
    if (value > 0) return theme.statusOk;
    if (value < 0) return theme.statusDanger;
    return theme.textMuted;
}

function tooltipLabel(spec: BarSpec, item: TooltipItem<BarKind>): string {
    const v = item.parsed.x ?? item.parsed.y ?? 0;
    const label = spec.valueLabel ? `${spec.valueLabel}: ` : "";
    return `${label}${formatNumber(v)}`;
}

function buildAxis(theme: ChartTheme, isCategory: boolean) {
    return {
        grid: { display: !isCategory, color: theme.grid },
        ticks: { color: theme.textMuted, autoSkip: !isCategory },
    };
}

function buildOptions(spec: BarSpec, theme: ChartTheme): ChartOptions<BarKind> {
    const indexAxis = spec.indexAxis ?? INDEX_AXIS_HORIZONTAL;
    const horizontal = indexAxis === INDEX_AXIS_HORIZONTAL;
    return {
        ...STATIC_BAR_OPTS,
        indexAxis,
        plugins: {
            legend: { display: DISABLED },
            tooltip: { enabled: ENABLED, callbacks: { label: (item) => tooltipLabel(spec, item) } },
        },
        scales: {
            x: { ...buildAxis(theme, !horizontal), beginAtZero: ENABLED },
            y: { ...buildAxis(theme, horizontal), beginAtZero: ENABLED },
        },
    };
}

function buildDataset(spec: BarSpec, theme: ChartTheme) {
    const values = spec.data.map((d) => d.value);
    const colors = values.map((v) => colorForValue(theme, v));
    return {
        label: spec.valueLabel ?? "",
        data: values,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 0,
        borderRadius: BAR_RADIUS,
        barThickness: BAR_THICKNESS,
        categoryPercentage: 1,
        barPercentage: 1,
        minBarLength: ZERO_BAR_LENGTH,
    };
}

function buildConfig(spec: BarSpec, theme: ChartTheme): ChartConfiguration<BarKind> {
    return {
        type: BAR_TYPE,
        data: {
            labels: spec.data.map((d) => d.label),
            datasets: [buildDataset(spec, theme)],
        },
        options: buildOptions(spec, theme),
    };
}

function buildMount(canvas: HTMLCanvasElement, chart: Chart<BarKind>): ChartMount {
    const mount: ChartMount = {
        destroy() {
            chart.destroy();
        },
        update(next: unknown) {
            const nextSpec = next as BarSpec;
            chart.data.labels = nextSpec.data.map((d) => d.label);
            chart.data.datasets[0]!.data = nextSpec.data.map((d) => d.value);
            chart.update("none");
        },
    };
    trackMount(canvas, mount);
    return mount;
}

function createBar(canvas: HTMLCanvasElement, spec: BarSpec): ChartMount {
    ensureCoreRegistered();
    const theme = getChartTheme();
    const chart = new Chart(canvas, buildConfig(spec, theme));
    return buildMount(canvas, chart);
}

export { createBar };
export type { BarSpec, BarDatum };
