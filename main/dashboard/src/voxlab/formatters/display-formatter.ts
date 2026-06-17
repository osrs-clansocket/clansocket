const KB = 1024;
const MB = KB * 1024;

export function formatNumber(value: number): string {
    return value.toLocaleString("en-US");
}

export function formatBytes(bytes: number): string {
    if (bytes < KB) {
        return `${bytes} B`;
    }
    if (bytes < MB) {
        return `${(bytes / KB).toFixed(1)} KB`;
    }
    return `${(bytes / MB).toFixed(2)} MB`;
}

export function formatRange(min: number, max: number, precision = 3): string {
    return `${min.toFixed(precision)} → ${max.toFixed(precision)}`;
}

export function formatOptional(value: number | undefined, precision = 3): string {
    if (value === undefined || value === null) {
        return "—";
    }
    return value.toFixed(precision);
}
