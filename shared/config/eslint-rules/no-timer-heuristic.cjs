/**
 * LVI/no-timer-heuristic — Bans setTimeout / setInterval / clearTimeout / clearInterval.
 *
 * Heuristic timers tie scheduling to process uptime + wall-clock cadence. They drift,
 * miss windows across restarts, race with concurrent triggers, and duplicate work when
 * the same logic fires from multiple places. The conditional-trigger doctrine here says:
 * the system knows `Date.now()`, the DB knows the canonical `<event>_at`, the gap
 * between them answers every "is it time" question — deterministically, race-free,
 * and re-derivable on every trigger.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");
const EXCLUSIONS = require("./no-timer-heuristic.exclusions.cjs");

const BANNED_IDENTIFIERS = new Set(["setTimeout", "setInterval", "clearTimeout", "clearInterval"]);
const TIMER_HOSTS = new Set(["window", "globalThis", "global", "self"]);
const EXCLUDED_PATH_SUFFIXES = EXCLUSIONS.map((e) => e.path);

function isExcluded(normalizedPath) {
  for (const suffix of EXCLUDED_PATH_SUFFIXES) {
    if (normalizedPath.endsWith(suffix)) return true;
  }
  return false;
}

function calleeName(callee) {
  if (callee.type === "Identifier") {
    return BANNED_IDENTIFIERS.has(callee.name) ? callee.name : null;
  }
  if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier") {
    const obj = callee.object;
    if (obj.type === "Identifier" && TIMER_HOSTS.has(obj.name) && BANNED_IDENTIFIERS.has(callee.property.name)) {
      return callee.property.name;
    }
  }
  return null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Ban heuristic timers — enforce conditional triggers + DB canonical timestamps" },
    schema: [],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    if (isExcluded(raw)) return {};
    const mod = getModuleForFile(raw);
    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (name === null) return;
        const t = trace(node, raw, mod);
        context.report({
          node,
          messageId: "report",
          data: {
            report: build4DReport({
              rule: "no-timer-heuristic",
              narrative: `${name}() is a heuristic timer. Scheduling here means "fire eventually based on process uptime + wall clock" — drifts on restart, races with concurrent triggers, duplicates work when the same logic fires from another path, and silently misses windows when the process is down.`,
              graph: {
                X: `${t.file}:${t.line} — ${name}() call in ${t.context}`,
                Y: `every decision derived from this firing depends on process uptime being continuous and the timer never overlapping a parallel trigger`,
                Z: `conditional triggers + canonical DB timestamps — the trigger is an event (request, message, route change, plugin connect), the gate is \`Date.now() - <canonical_at> ≥ <threshold>\` read fresh on every trigger`,
                W: `restart drops the schedule, two concurrent calls duplicate the action, the same logic invoked from a different path races against the in-flight timer, the process being down silently skips a window with no catch-up`,
              },
              remediation: `Remove ${name}() at ${t.file}:${t.line}. Pick a real trigger (express handler, ws event, route:change emitter, plugin identity, etc) and call the work directly. Inside the work, gate decisions on \`Date.now() - <db_column> ≥ <threshold>\` so the same trigger fired twice converges instead of double-firing. If this is a protocol-level keep-alive (ws ping/pong, reconnect backoff) where the timer is intrinsic to the wire protocol rather than business scheduling, add an inline \`eslint-disable-next-line lvi/no-timer-heuristic\` with a comment explaining the protocol requirement.`,
              trace: t,
            }),
          },
        });
      },
    };
  },
};
