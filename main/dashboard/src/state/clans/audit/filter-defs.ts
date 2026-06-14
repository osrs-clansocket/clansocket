import { MS_PER_DAY, MS_PER_HOUR } from "../../time-units.js";

const SEVEN_DAYS = 7;

export interface KindFilter {
    key: string;
    label: string;
    prefix: string | null;
    exclude: string | null;
}

export const KIND_FILTERS: readonly KindFilter[] = [
    { key: "all", label: "all", prefix: null, exclude: null },
    { key: "server", label: "server", prefix: "server:", exclude: "server:read." },
    { key: "reads", label: "reads", prefix: "server:read.", exclude: null },
    { key: "client", label: "client", prefix: "client:", exclude: null },
];

export interface RangeFilter {
    key: string;
    label: string;
    sinceMs: number | null;
}

export const RANGE_FILTERS: readonly RangeFilter[] = [
    { key: "all", label: "all time", sinceMs: null },
    { key: "1h", label: "1h", sinceMs: MS_PER_HOUR },
    { key: "24h", label: "24h", sinceMs: MS_PER_DAY },
    { key: "7d", label: "7d", sinceMs: SEVEN_DAYS * MS_PER_DAY },
];
