export interface UserDataStats {
    totalRows: number;
    totalBytes: number;
    totalDbs: number;
    firstEntryAt: number | null;
}

export interface TableStat {
    rows: number;
    bytes: number;
    minTs: number | null;
}

export const ZERO: TableStat = { rows: 0, bytes: 0, minTs: null };
