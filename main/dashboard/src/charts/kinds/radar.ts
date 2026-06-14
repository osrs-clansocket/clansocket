import type { ChartConfiguration, ChartOptions, TooltipItem } from "chart.js";
import { RadarController, RadialLinearScale, LineElement, PointElement } from "chart.js";
import { ensureCoreRegistered, Chart } from "../plugins";
import { getChartTheme } from "../theme";
import { formatNumber } from "../helpers";
import { trackMount } from "../registry";
import type { ChartMount, ChartTheme } from "../types";
import { ENABLED, DISABLED, ANIM_DURATION } from "./flags";

interface RadarDatum {
    label: string;
    value: number;
}

interface RadarSeries {
    label: string;
    data: RadarDatum[];
}

interface RadarSpec {
    series: RadarSeries[];
    valueLabel?: string;
}

const RADAR_TYPE = "radar" as const;
type RadarKind = typeof RADAR_TYPE;
const FILL_ALPHA = "33";
const BORDER_WIDTH = 2;
const POINT_RADIUS = 3;

let registered = false;

function ensureRadarRegistered(): void {
    if (registered) return;
    Chart.register(RadarController, RadialLinearScale, LineElement, PointElement);
    registered = true;
}

function tooltipLabel(item: TooltipItem<RadarKind>): string {
    const v = item.parsed?.r ?? 0;
    return `${item.dataset.label ?? item.label}: ${formatNumber(v)}`;
}

function buildOptions(theme: ChartTheme): ChartOptions<RadarKind> {
    return {
        responsive: ENABLED,
        maintainAspectRatio: DISABLED,
        animation: { duration: ANIM_DURATION },
        plugins: {
            legend: { display: ENABLED, position: "bottom", labels: { color: theme.text } },
            tooltip: { enabled: ENABLED, callbacks: { label: tooltipLabel } },
        },
        scales: {
            r: {
                grid: { color: theme.grid },
                angleLines: { color: theme.grid },
                pointLabels: { color: theme.text },
                ticks: { display: DISABLED },
                beginAtZero: ENABLED,
            },
        },
    };
}

function buildDataset(s: RadarSeries, color: string) {
    return {
        label: s.label,
        data: s.data.map((d) => d.value),
        borderColor: color,
        backgroundColor: `${color}${FILL_ALPHA}`,
        borderWidth: BORDER_WIDTH,
        pointRadius: POINT_RADIUS,
        pointBackgroundColor: color,
    };
}

function buildConfig(spec: RadarSpec, theme: ChartTheme): ChartConfiguration<RadarKind> {
    const labels = spec.series[0]?.data.map((d) => d.label) ?? [];
    const datasets = spec.series.map((s, i) => buildDataset(s, theme.palette[i % theme.palette.length]!));
    return {
        type: RADAR_TYPE,
        data: { labels, datasets },
        options: buildOptions(theme),
    };
}

function buildMount(canvas: HTMLCanvasElement, chart: Chart<RadarKind>): ChartMount {
    const mount: ChartMount = {
        destroy() {
            chart.destroy();
        },
        update(next: unknown) {
            const nextSpec = next as RadarSpec;
            chart.data.labels = nextSpec.series[0]?.data.map((d) => d.label) ?? [];
            chart.data.datasets.forEach((ds, i) => {
                ds.data = nextSpec.series[i]?.data.map((d) => d.value) ?? [];
            });
            chart.update("none");
        },
    };
    trackMount(canvas, mount);
    return mount;
}

function createRadar(canvas: HTMLCanvasElement, spec: RadarSpec): ChartMount {
    ensureCoreRegistered();
    ensureRadarRegistered();
    const theme = getChartTheme();
    const chart = new Chart(canvas, buildConfig(spec, theme));
    return buildMount(canvas, chart);
}

export { createRadar };
export type { RadarSpec, RadarSeries, RadarDatum };
