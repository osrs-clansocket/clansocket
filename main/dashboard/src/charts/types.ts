type ChartKind =
    | "kpi-tile"
    | "time-line"
    | "multi-line"
    | "doughnut"
    | "radar"
    | "bar"
    | "heatmap"
    | "milestone-timeline";

type StatusLevel = "ok" | "warn" | "danger" | "none";

interface TimePoint {
    t: string | number;
    v: number;
}

interface SparkSeries {
    label?: string;
    points: TimePoint[];
}

interface TimeLineData {
    series: SparkSeries[];
    yLabel?: string;
}

interface ChartTheme {
    palette: string[];
    text: string;
    textMuted: string;
    grid: string;
    primary: string;
    secondary: string;
    statusOk: string;
    statusWarn: string;
    statusDanger: string;
    fontBody: string;
    fontHeading: string;
}

interface ChartCanvas {
    canvas: HTMLCanvasElement;
    kind: ChartKind;
    dataKey: string;
    key: string;
}

interface ChartMount {
    destroy(): void;
    update(data: unknown): void;
}

interface HeatmapCell {
    x: string;
    y: string;
    v: number;
}

export type {
    ChartKind,
    ChartCanvas,
    ChartMount,
    ChartTheme,
    StatusLevel,
    TimePoint,
    SparkSeries,
    TimeLineData,
    HeatmapCell,
};
