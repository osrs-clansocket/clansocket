import type { EventFn, ServerEvent, StatusFn } from "./types.js";

const SSE_PREFIX = "data: ";
const SSE_DELIMITER = "\n\n";

export function emitChainEvent(
    ev: { type: string; payload: Record<string, unknown> },
    onStatus?: StatusFn,
    onEvent?: EventFn,
): void {
    if (ev.type === "status") {
        const status = (ev.payload as { status?: string }).status;
        if (status && onStatus) onStatus(status);
    } else if (onEvent) {
        onEvent(ev.type, ev.payload);
    }
}

export function parseEvents(buffer: string): { events: ServerEvent[]; rest: string } {
    const events: ServerEvent[] = [];
    let cursor = 0;
    while (true) {
        const idx = buffer.indexOf(SSE_DELIMITER, cursor);
        if (idx === -1) break;
        const block = buffer.slice(cursor, idx);
        cursor = idx + SSE_DELIMITER.length;
        const lines = block.split("\n");
        const dataParts: string[] = [];
        let started = false;
        for (const line of lines) {
            if (line.startsWith(SSE_PREFIX)) {
                dataParts.push(line.slice(SSE_PREFIX.length));
                started = true;
            } else if (started) {
                dataParts.push(line);
            }
        }
        if (!started) continue;
        const json = dataParts.join("\n");
        if (json.length === 0) continue;
        try {
            events.push(JSON.parse(json) as ServerEvent);
        } catch {
            continue;
        }
    }
    return { events, rest: buffer.slice(cursor) };
}
