import {
    Chart,
    LineController,
    BarController,
    LineElement,
    PointElement,
    BarElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Filler,
    Tooltip,
    Legend,
    Title,
    Decimation,
} from "chart.js";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import { applyChartDefaults } from "./theme";

let initialized = false;
let zoomRegistered = false;

function ensureCoreRegistered(): void {
    if (initialized) return;
    Chart.register(
        LineController,
        BarController,
        LineElement,
        PointElement,
        BarElement,
        LinearScale,
        CategoryScale,
        TimeScale,
        Filler,
        Tooltip,
        Legend,
        Title,
        Decimation,
    );
    applyChartDefaults(Chart as unknown as Parameters<typeof applyChartDefaults>[0]);
    initialized = true;
}

function ensureZoomRegistered(): void {
    if (zoomRegistered) return;
    Chart.register(zoomPlugin);
    zoomRegistered = true;
}

export { ensureCoreRegistered, ensureZoomRegistered, Chart };
