import { TIMING_CONSTANTS } from "../../constants/index.js";

export function formatBytes(bytes) {
    if (bytes >= 1_000_000_000) {
        return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
    }
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

export function formatDuration(milliseconds) {
    return (milliseconds / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS).toFixed(2);
}

export function timeStamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").replace(/T/, "_").slice(0, -5);
}

export function formatDisplayTimestamp(date = new Date()) {
    return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
