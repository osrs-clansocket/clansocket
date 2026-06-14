"use strict";

const fs = require("fs");
const path = require("path");

const ROOT_HOPS = 8;
const ROUTE_FILES = [
    "database/plugin/projection/route-current-state.ts",
    "database/plugin/projection/route-events.ts",
    "database/plugin/projection/route-buckets.ts",
];
const EVENT_TYPES_FILE = "plugin-api/event-types.ts";
const EVENT_PREFIX = "EVENT_";
const DECL = "export const ";

let ROUTED = null;
let SERVER_SRC = null;

function findServerSrc() {
    let dir = __dirname;
    for (let i = 0; i < ROOT_HOPS; i += 1) {
        const candidate = path.join(dir, "main", "server", "src");
        if (fs.existsSync(candidate)) return candidate;
        dir = path.dirname(dir);
    }
    return null;
}

function read(srcRoot, rel) {
    try {
        return fs.readFileSync(path.join(srcRoot, rel), "utf8");
    } catch {
        return "";
    }
}

function isNameChar(c) {
    return (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_";
}

// EVENT_NAME -> "value" from event-types.ts (`export const EVENT_X = "x";`)
function parseEventValues(text) {
    const map = new Map();
    for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t.startsWith(DECL + EVENT_PREFIX)) continue;
        const eq = t.indexOf("=");
        if (eq === -1) continue;
        const name = t.slice(DECL.length, eq).trim();
        const q1 = t.indexOf('"', eq);
        const q2 = q1 === -1 ? -1 : t.indexOf('"', q1 + 1);
        if (q2 === -1) continue;
        map.set(name, t.slice(q1 + 1, q2));
    }
    return map;
}

// every EVENT_NAME token mentioned in a route file (import == key, no unused imports)
function collectEventNames(text, into) {
    let i = text.indexOf(EVENT_PREFIX);
    while (i !== -1) {
        let j = i + EVENT_PREFIX.length;
        while (j < text.length && isNameChar(text[j])) j += 1;
        into.add(text.slice(i, j));
        i = text.indexOf(EVENT_PREFIX, j);
    }
}

function buildRoutedValues() {
    const srcRoot = SERVER_SRC || findServerSrc();
    SERVER_SRC = srcRoot;
    const routed = new Set();
    if (!srcRoot) return routed;
    const values = parseEventValues(read(srcRoot, EVENT_TYPES_FILE));
    const names = new Set();
    for (const rel of ROUTE_FILES) collectEventNames(read(srcRoot, rel), names);
    for (const name of names) {
        const v = values.get(name);
        if (v) routed.add(v);
    }
    return routed;
}

function getRouted() {
    if (ROUTED === null) ROUTED = buildRoutedValues();
    return ROUTED;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Every telemetry message type in client-telemetry.ts must resolve to a projection route (route-current-state / route-events / route-buckets). A type with no route is silently dropped by routePluginEvent. Self-gated to plugin-api/types/client-telemetry.ts. Control/protocol events are out of scope (handled by other dispatch).",
        },
        schema: [],
        messages: {
            unrouted:
                'Telemetry message type "{{type}}" has no projection route handler (route-current-state / route-events / route-buckets). routePluginEvent would silently drop it. Add a handler + route, or remove the type.',
        },
    },
    create(context) {
        const filename = context.filename || (context.getFilename && context.getFilename());
        if (!filename) return {};
        if (!filename.split(path.sep).join("/").endsWith("/plugin-api/types/client-telemetry.ts")) return {};
        const routed = getRouted();
        if (routed.size === 0) return {};

        return {
            TSPropertySignature(node) {
                if (!node.key || node.key.name !== "type") return;
                const ann = node.typeAnnotation && node.typeAnnotation.typeAnnotation;
                if (!ann || ann.type !== "TSLiteralType") return;
                const lit = ann.literal;
                if (!lit || lit.type !== "Literal" || typeof lit.value !== "string") return;
                if (routed.has(lit.value)) return;
                context.report({ loc: lit.loc, messageId: "unrouted", data: { type: lit.value } });
            },
        };
    },
};
