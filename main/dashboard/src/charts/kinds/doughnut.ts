import type { ChartConfiguration, ChartOptions, TooltipItem } from "chart.js";
import { ArcElement, DoughnutController } from "chart.js";
import { ensureCoreRegistered, Chart } from "../plugins";
import { getChartTheme } from "../theme";
import { formatNumber } from "../helpers";
import { trackMount } from "../registry";
import type { ChartMount, ChartTheme } from "../types";
import { ENABLED, DISABLED, ANIM_DURATION } from "./flags";

interface DoughnutDatum {
    label: string;
    value: number;
}

interface DoughnutSpec {
    data: DoughnutDatum[];
    valueLabel?: string;
    cutout?: string;
    showLegend?: boolean;
}

const DOUGHNUT_TYPE = "doughnut" as const;
type DoughnutKind = typeof DOUGHNUT_TYPE;
const DEFAULT_CUTOUT = "60%";
const BORDER_WIDTH = 1;
const LEGEND_PAD = 8;
const PCT_BASE = 100;

let registered = false;

function ensureDoughnutRegistered(): void {
    if (registered) return;
    Chart.register(ArcElement, DoughnutController);
    registered = true;
}

function tooltipLabel(spec: DoughnutSpec, item: TooltipItem<DoughnutKind>): string {
    const v = item.parsed ?? 0;
    const total = spec.data.reduce((s, d) => s + d.value, 0);
    const pct = total > 0 ? Math.round((v / total) * PCT_BASE) : 0;
    return `${item.label}: ${formatNumber(v)} (${pct}%)`;
}

function buildOptions(spec: DoughnutSpec, theme: ChartTheme): ChartOptions<DoughnutKind> {
    return {
        responsive: ENABLED,
        maintainAspectRatio: DISABLED,
        animation: { duration: ANIM_DURATION },
        cutout: spec.cutout ?? DEFAULT_CUTOUT,
        plugins: {
            legend: {
                display: spec.showLegend ?? ENABLED,
                position: "bottom",
                labels: { color: theme.text, padding: LEGEND_PAD },
            },
            tooltip: { enabled: ENABLED, callbacks: { label: (item) => tooltipLabel(spec, item) } },
        },
    };
}

function buildConfig(spec: DoughnutSpec, theme: ChartTheme): ChartConfiguration<DoughnutKind> {
    const values = spec.data.map((d) => d.value);
    const colors = values.map((_, i) => theme.palette[i % theme.palette.length]!);
    return {
        type: DOUGHNUT_TYPE,
        data: {
            labels: spec.data.map((d) => d.label),
            datasets: [
                {
                    label: spec.valueLabel ?? "",
                    data: values,
                    backgroundColor: colors,
                    borderColor: theme.text,
                    borderWidth: BORDER_WIDTH,
                },
            ],
        },
        options: buildOptions(spec, theme),
    };
}

function buildMount(canvas: HTMLCanvasElement, chart: Chart<DoughnutKind>): ChartMount {
    const mount: ChartMount = {
        destroy() {
            chart.destroy();
        },
        update(next: unknown) {
            const nextSpec = next as DoughnutSpec;
            chart.data.labels = nextSpec.data.map((d) => d.label);
            chart.data.datasets[0]!.data = nextSpec.data.map((d) => d.value);
            chart.update("none");
        },
    };
    trackMount(canvas, mount);
    return mount;
}

function createDoughnut(canvas: HTMLCanvasElement, spec: DoughnutSpec): ChartMount {
    ensureCoreRegistered();
    ensureDoughnutRegistered();
    const theme = getChartTheme();
    const chart = new Chart(canvas, buildConfig(spec, theme));
    return buildMount(canvas, chart);
}

export { createDoughnut };
export type { DoughnutSpec, DoughnutDatum };
