/**
 * LVI/no-direct-localstorage — localStorage access must go through the
 * centralized persistence helper (src/state/persistence/storage.ts) or the
 * persistedSignal/persistedScope wrappers. Direct calls bypass: namespace
 * prefix, schema sentinel, fail-silent quota handling, write-through deduping
 * via Object.is, and the audit graph (grep persistedSignal to enumerate all
 * persisted state).
 *
 * Caught:
 *   localStorage.getItem(...)
 *   localStorage.setItem(...)
 *   localStorage.removeItem(...)
 *   localStorage.clear()
 *   localStorage.key(...)
 *   localStorage[someKey]   (bracket access — flagged by tracker)
 *
 * Pre-existing scattered usages are exempted via no-direct-localstorage.exclusions.cjs
 * with documented reasons. New usages must use persistedSignal or extend the
 * storage helper if a genuinely new shape is needed (rare).
 */

const path = require("path");
const fs = require("fs");

const RAW_EXCLUSIONS = require("./no-direct-localstorage.exclusions.cjs");
const EXCLUSION_PATHS = new Set(
    RAW_EXCLUSIONS.map((entry) => entry.file.split("\\").join("/").replace(/\/+$/, "")),
);

function isExempt(normPath) {
    for (const exempt of EXCLUSION_PATHS) {
        if (normPath.endsWith(exempt)) return true;
    }
    return false;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Direct localStorage access is forbidden — use persistedSignal/persistedScope from state/persistence.",
        },
        schema: [],
        messages: {
            direct:
                "Direct localStorage.{{name}} bypasses the persistence chokepoint. Use persistedSignal/persistedScope from state/persistence/index.ts (or extend state/persistence/storage.ts if a genuinely new shape is needed).",
            bracket:
                "Bracket access to localStorage bypasses the persistence chokepoint. Use persistedSignal/persistedScope.",
        },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExempt(raw)) return {};
        // Exempt the storage helper itself
        if (raw.endsWith("/state/persistence/storage.ts")) return {};
        return {
            MemberExpression(node) {
                const obj = node.object;
                if (!obj || obj.type !== "Identifier" || obj.name !== "localStorage") return;
                if (node.computed) {
                    context.report({ node, messageId: "bracket" });
                    return;
                }
                const name = node.property && node.property.name;
                if (!name) return;
                context.report({ node, messageId: "direct", data: { name } });
            },
        };
    },
};
