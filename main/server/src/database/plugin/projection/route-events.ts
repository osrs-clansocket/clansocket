import type { Database } from "better-sqlite3";
import type { Payload } from "./helpers.js";

export type NowRouteFn = (
    conn: Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
) => void;

export const EVENT_ROUTES: Record<string, NowRouteFn> = {};
