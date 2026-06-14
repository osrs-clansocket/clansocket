import { subscribeWritesMux } from "./stream-mux.js";
import type { WritesStreamEvent } from "../types.js";

export function openWritesStream(onEvent: (event: WritesStreamEvent) => void): () => void {
    return subscribeWritesMux(onEvent);
}
