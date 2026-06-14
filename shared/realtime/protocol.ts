export type Topic = string;
export type RowKey = string;
export type RowRecord = Record<string, unknown>;

export type DeltaOp = "upsert" | "remove";

export interface RowDelta {
    topic: Topic;
    seq: number;
    key: RowKey;
    op: DeltaOp;
    row: RowRecord | null;
}

export interface DeltaBatch {
    topic: Topic;
    fromSeq: number;
    toSeq: number;
    deltas: RowDelta[];
}

export interface ResumeRequest {
    topic: Topic;
    lastSeq: number;
}

export interface SnapshotBaseline {
    topic: Topic;
    seq: number;
    rows: RowRecord[];
}
