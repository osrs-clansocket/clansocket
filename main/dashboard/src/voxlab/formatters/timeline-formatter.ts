import type { Timeline } from "../../shared/types/voxlab/timeline-types.js";

export function formatTimelineAsJson(timeline: Timeline): string {
    return JSON.stringify(timeline);
}

export function timelineFileName(stem: string): string {
    return `${stem}.timeline.json`;
}
