import type { Database } from "better-sqlite3";
import type { Payload } from "./helpers.js";

export type BucketRouteFn = (
    conn: Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    bucket: number,
) => void;

export const BUCKET_ROUTES: Record<string, BucketRouteFn> = {};
