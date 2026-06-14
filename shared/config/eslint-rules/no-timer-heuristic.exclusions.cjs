/**
 * Files exempt from lvi/no-timer-heuristic.
 *
 * Three legitimate categories:
 *   1. wire-protocol — timer is intrinsic to a network protocol (ws keep-alive, handshake deadline)
 *   2. event-coalescer — trigger IS an event (fs watcher, queue enqueue), timer just debounces / batches
 *   3. tooling — dev-only scripts, not production code path
 *
 * Path is matched as a suffix against the file's normalized path
 * (forward slashes, relative from repo root). Whole file is exempt — no per-line granularity.
 *
 * When adding an entry: the `reason` must say WHY a timer is acceptable here.
 * If the answer is "convenience" or "i didnt want to refactor", the answer is wrong — refactor instead.
 */
module.exports = [
    {
        path: "main/server/src/plugin-api/server.ts",
        reason: "wire-protocol — ws heartbeat ping setInterval detects dead tcp. wire-level keep-alive, not business scheduling.",
    },
    {
        path: "main/server/src/plugin-api/socket-state.ts",
        reason: "wire-protocol — identity-handshake deadline setTimeout closes ws if plugin never sends identity. wire-level keep-alive, not business scheduling.",
    },
    {
        path: "main/server/src/ai/persona/prompt-loader/registry.ts",
        reason: "event-coalescer — fs-watcher fires on every file write. timer debounces editor-save bursts into one reload. trigger IS the watcher event.",
    },
    {
        path: "main/server/src/ai/discord-events-webhook.ts",
        reason: "event-coalescer — outbound webhook batching window. discord rate-limits, batching is the friendly contract. trigger IS each enqueue.",
    },
    {
        path: "main/server/src/dev.ts",
        reason: "tooling — npm run dev script. polls until the tsx-launched server binds its port. dev-only, never ships to production.",
    },
];
