/* eslint-disable lvi/no-console */

function ts() { return new Date().toISOString(); }

function formatSemantic(message) {
    return `[${ts()}] ${message}`;
}

function firstFrame(stack) {
    if (!stack) { return 'unknown'; }
    const lines = stack.split('\n');
    return (lines[1] || lines[0] || 'unknown').trim();
}

function format4D(message, data) {
    const lines = [`[${ts()}] ${message}`];
    if (data.X) { lines.push(`  X  ${data.X}`); }
    if (data.Y) { lines.push(`  Y  ${data.Y}`); }
    if (data.Z) { lines.push(`  Z  ${data.Z}`); }
    if (data.W) { lines.push(`  W  ${data.W}`); }
    if (data.remediation) { lines.push(`  ->  ${data.remediation}`); }
    if (data.stack) { lines.push(`  at ${firstFrame(data.stack)}`); }
    if (data.error && !data.stack) { lines.push(`  err ${data.error}`); }
    return lines.join('\n');
}

function info(message) {
    console.log(formatSemantic(message));
}

function warn(message) {
    console.warn(formatSemantic(message));
}

function error(message, data = {}) {
    const enriched = data instanceof Error ? { error: data.message, stack: data.stack } : data;
    console.error(format4D(message, enriched));
}

function debug(message, data = {}) {
    console.debug(formatSemantic(message), data);
}

function write(level, message, data = {}) {
    const fn = console[level] || console.log;
    fn(formatSemantic(message), data);
}

module.exports = { info, warn, error, debug, write };
