const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport } = require("./report-builder.cjs");
const { hashNode, getObjKeys } = require("./duplication-hash.cjs");
const ALLOWLIST = require("./no-cross-file-duplication.allowlist.cjs");
const EXCLUSIONS = require("./no-cross-file-duplication.exclusions.cjs");
const { collectCentralizedNames, containsCentralizedRef } = require("./dup-shared-roots.cjs");

function isExcludedFile(normPath) {
    for (const entry of EXCLUSIONS) {
        if (normPath.endsWith(entry.path)) return true;
    }
    return false;
}

const THRESHOLDS = {
    literal: 5,
    structural: 2,
    logical: 2,
    data: 2,
    behavioral: 2,
    validation: 2,
    temporal: 2,
};

const MIN_LITERAL_STRING_LEN = 8;
const MIN_FUNC_HASH_LEN = 15;
const MIN_COND_HASH_LEN = 5;
const MIN_OBJ_KEYS = 3;

const TYPEOF_TYPES = new Set(["string", "number", "boolean", "object", "function", "undefined", "symbol", "bigint", "u"]);
const TRIVIAL_NUMBERS = new Set([-1, 0, 1, 2]);
const TRIVIAL_STRINGS = new Set([", ", " | ", "/", ".", ":", "-", "_", " ", "\n", "\t", "?", "*", "(", ")"]);

const STATE = {
    literals: new Map(),
    funcs: new Map(),
    conditions: new Map(),
    shapes: new Map(),
    handlers: new Map(),
    validations: new Map(),
    timers: new Map(),
};

function bucket(map, key, entry) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
}

function distinctFiles(group) {
    const set = new Set();
    for (const e of group) set.add(e.file);
    return set.size;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Detect cross-file duplication within module boundaries" },
        schema: [],
        messages: { dup: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        if (!raw.includes("/src/")) return {};
        if (isExcludedFile(raw)) return {};
        const mod = getModuleForFile(raw);
        if (!mod) return {};
        const file = raw.split("/src/").pop() || raw;
        let centralizedNames = new Set();

        function reportCross(type, group, narrative, fix) {
            context.report({
                node: group[group.length - 1].node,
                messageId: "dup",
                data: {
                    report: build4DReport({
                        rule: `no-cross-file-duplication/${type}`,
                        narrative,
                        graph: {
                            X: `${file} — ${type} duplicate of ${distinctFiles(group) - 1} other file(s)`,
                            Y: `${group.length} call sites across ${distinctFiles(group)} files share the same value/shape`,
                            Z: `no_separation (EliminateDuplicationViaSharing) — cross-file duplication type: ${type}`,
                            W: `every duplicate is a divergence risk — one site changes, the rest drift`,
                        },
                        remediation: fix,
                        trace: { file, line: String(group[group.length - 1].node.loc.start.line), col: "0", context: "module", module: mod, related: group.slice(0, -1).map(e => e.file) },
                    }),
                },
            });
        }

        return {
            Program(node) {
                centralizedNames = collectCentralizedNames(node, raw);
            },
            Literal(node) {
                if (node.parent && node.parent.type === "ImportDeclaration") return;
                if (node.regex) return;
                if (typeof node.value === "boolean") return;
                if (node.value === null) return;
                if (typeof node.value === "string") {
                    if (node.value.length < MIN_LITERAL_STRING_LEN) return;
                    if (TYPEOF_TYPES.has(node.value)) return;
                    if (TRIVIAL_STRINGS.has(node.value)) return;
                }
                if (typeof node.value === "number" && TRIVIAL_NUMBERS.has(node.value)) return;
                const key = `${mod}::${JSON.stringify(node.value)}`;
                bucket(STATE.literals, key, { file, node });
            },
            "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(node) {
                if (!node.body) return;
                const hash = hashNode(node.body, 0);
                if (hash.length < MIN_FUNC_HASH_LEN) return;
                const key = `${mod}::${hash}`;
                bucket(STATE.funcs, key, { file, node });
            },
            IfStatement(node) {
                if (containsCentralizedRef(node.test, centralizedNames)) return;
                const hash = hashNode(node.test, 0);
                if (hash.length < MIN_COND_HASH_LEN) return;
                const key = `${mod}::${hash}`;
                bucket(STATE.conditions, key, { file, node });
            },
            ObjectExpression(node) {
                if (!node.properties || node.properties.length < MIN_OBJ_KEYS) return;
                // Architectural necessity: option-bag passed as first arg to a helper-style call
                // (e.g. `button({onClick, text, variant})`, `div({classes}, [...])`,
                // `glassConfirm({title, message, ...})`). Every consumer of a centralized factory
                // has the same call-shape by design — that IS DRY working. Skip when the parent
                // is a CallExpression with a bare-identifier callee and this object is its first
                // or only argument.
                if (
                    node.parent &&
                    node.parent.type === "CallExpression" &&
                    node.parent.callee.type === "Identifier" &&
                    node.parent.arguments[0] === node
                ) return;
                const keys = getObjKeys(node);
                if (keys.length < MIN_OBJ_KEYS) return;
                const key = `${mod}::${keys.join(",")}`;
                bucket(STATE.shapes, key, { file, node });
            },
            "CallExpression[callee.property.name='addEventListener']"(node) {
                const eventArg = node.arguments[0];
                const handlerArg = node.arguments[1];
                if (!eventArg || !handlerArg) return;
                if (containsCentralizedRef(handlerArg, centralizedNames)) return;
                const event = eventArg.type === "Literal" ? String(eventArg.value) : "dynamic";
                const hash = `${event}:${hashNode(handlerArg, 0)}`;
                const key = `${mod}::${hash}`;
                bucket(STATE.handlers, key, { file, node });
            },
            "BinaryExpression[operator='==='], BinaryExpression[operator='!==']"(node) {
                if (node.left.type !== "UnaryExpression" || node.left.operator !== "typeof") return;
                if (containsCentralizedRef(node.left.argument, centralizedNames)) return;
                const hash = hashNode(node, 0);
                const key = `${mod}::${hash}`;
                bucket(STATE.validations, key, { file, node });
            },
            "CallExpression[callee.name='setTimeout'], CallExpression[callee.name='setInterval']"(node) {
                if (!node.arguments[1]) return;
                const hash = `${node.callee.name}:${hashNode(node.arguments[0], 0)}`;
                const key = `${mod}::${hash}`;
                bucket(STATE.timers, key, { file, node });
            },
            "Program:exit"() {
                emit("literal", STATE.literals, THRESHOLDS.literal, file, mod, reportCross);
                emit("structural", STATE.funcs, THRESHOLDS.structural, file, mod, reportCross);
                emit("logical", STATE.conditions, THRESHOLDS.logical, file, mod, reportCross);
                emit("data", STATE.shapes, THRESHOLDS.data, file, mod, reportCross);
                emit("behavioral", STATE.handlers, THRESHOLDS.behavioral, file, mod, reportCross);
                emit("validation", STATE.validations, THRESHOLDS.validation, file, mod, reportCross);
                emit("temporal", STATE.timers, THRESHOLDS.temporal, file, mod, reportCross);
            },
        };
    },
};

function emit(type, map, threshold, currentFile, mod, reportCross) {
    const allowed = ALLOWLIST[type] || {};
    const modPrefix = `${mod}::`;
    for (const [key, group] of map) {
        if (group.length < threshold) continue;
        if (distinctFiles(group) < 2) continue;
        const myEntries = group.filter(e => e.file === currentFile);
        if (myEntries.length === 0) continue;
        const fingerprint = key.startsWith(modPrefix) ? key.slice(modPrefix.length) : key;
        if (Object.prototype.hasOwnProperty.call(allowed, fingerprint)) continue;
        const otherFiles = [...new Set(group.filter(e => e.file !== currentFile).map(e => e.file))];
        const narrative = `Cross-file ${type} duplication. This file participates in a group of ${group.length} occurrences across ${distinctFiles(group)} files. Same value/shape appears in: ${otherFiles.slice(0, 5).join(", ")}${otherFiles.length > 5 ? ` (+${otherFiles.length - 5} more)` : ""}.`;
        const fix = `Extract to a shared *-constants.ts / *-messages.ts / helper module. All files in the group must import from one source of truth.\n\nAllowlist key: ${type}:${fingerprint}\n(paste into shared/config/eslint-rules/no-cross-file-duplication.allowlist.cjs under "${type}" with a one-line reason to silence)`;
        reportCross(type, myEntries, narrative, fix);
    }
}
