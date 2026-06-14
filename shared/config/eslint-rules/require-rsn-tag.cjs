/**
 * LVI/require-rsn-tag — every rsn rendered on the site must go through the rsnTag factory.
 *
 * Bare `text: "<rsn>..."`, `text: \`${x.rsn} ...\``, `text: user.rsn` and friends in a UI
 * factory call render an rsn without its OSRS clan rank icon — clannies recognize each
 * other by rank icon first, and inconsistent rsn rendering across pages erodes the
 * "i know who this is at a glance" UX. The mandate is centralized in
 * src/dom/factory/data/rsn-tag.ts which prepends the rank icon (or favicon fallback
 * when rank is null) at the canonical 0.825rem size.
 *
 * Caught patterns (in any `text:` property of a factory call OR in `.setText(...)`
 * method calls on factory Instances, outside the factory dir):
 *   span({ text: s.rsn })                          — direct member access
 *   span({ text: rsn })                            — bare identifier named "rsn"
 *   paragraph({ text: \`hello ${user.rsn}!\` })    — template literal interpolation
 *   span({ text: "Hi " + match.rsn })              — concat
 *   span({ text: someLatestRsn })                  — variable ending in "Rsn"
 *   span({ text: derived(() => row.rsn) })         — reactive wrapper body
 *   span({ text: signal(row.latest_rsn) })         — signal initial value
 *   inst.setText(row.rsn)                          — setText method on factory Instance
 *   inst.setText(derived(() => row.rsn))           — reactive setText
 *
 * Member names treated as rsn-bearing:
 *   .rsn, .latestRsn / .latest_rsn, .senderRsn / .sender_rsn, anything ending in Rsn / _rsn
 *
 * Exempt files (the util + tests):
 *   src/dom/factory/data/rsn-tag.ts                (the util itself; defines the surface)
 *   anything under src/dom/factory/**              (factory chokepoint can compose freely)
 *
 * Allowed shape:
 *   rsnTag({ rsn: s.rsn, rank: s.inGameClanRank })  — sanctioned path; not flagged
 *
 * Escape hatch: precede the offending line with
 *   // eslint-disable-next-line lvi/require-rsn-tag
 * and add a one-line WHY above it. The no-comments cleaner preserves eslint directives.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];
const REACTIVE_WRAPPER_NAMES = new Set(["derived", "signal", "effect"]);
const SET_TEXT_METHOD = "setText";

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function isRsnBearingName(name) {
    if (typeof name !== "string" || name.length === 0) return false;
    if (name === "rsn") return true;
    if (name.endsWith("Rsn")) return true;
    if (name.endsWith("_rsn")) return true;
    return false;
}

function propName(prop) {
    if (!prop) return null;
    if (prop.name) return prop.name;
    if (prop.value !== undefined && typeof prop.value === "string") return prop.value;
    return null;
}

function functionBodyContainsRsn(body) {
    if (body.type !== "BlockStatement") return valueContainsRsn(body);
    for (const stmt of body.body) {
        if (stmt.type === "ReturnStatement" && stmt.argument && valueContainsRsn(stmt.argument)) return true;
    }
    return false;
}

function valueContainsRsn(node) {
    if (!node) return false;
    if (node.type === "Identifier") return isRsnBearingName(node.name);
    if (node.type === "MemberExpression") return isRsnBearingName(propName(node.property));
    if (node.type === "TemplateLiteral") {
        for (const expr of node.expressions) {
            if (valueContainsRsn(expr)) return true;
        }
        return false;
    }
    if (node.type === "BinaryExpression" && node.operator === "+") {
        return valueContainsRsn(node.left) || valueContainsRsn(node.right);
    }
    if (node.type === "ConditionalExpression") {
        return valueContainsRsn(node.consequent) || valueContainsRsn(node.alternate);
    }
    if (node.type === "LogicalExpression") {
        return valueContainsRsn(node.left) || valueContainsRsn(node.right);
    }
    if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
        return functionBodyContainsRsn(node.body);
    }
    if (node.type === "CallExpression") {
        const callee = node.callee;
        const calleeName = callee.type === "Identifier" ? callee.name : null;
        if (calleeName !== null && REACTIVE_WRAPPER_NAMES.has(calleeName)) {
            for (const arg of node.arguments) {
                if (valueContainsRsn(arg)) return true;
            }
        }
        return false;
    }
    return false;
}

function buildReport(t, surface) {
    return build4DReport({
        rule: "require-rsn-tag",
        narrative:
            `Feature code passed an rsn into ${surface}. ` +
            `Every rsn rendered on the site MUST go through rsnTag({ rsn, rank? }) ` +
            `so the OSRS clan rank icon appears next to the name (or the favicon ` +
            `fallback when rank is unknown). Bare text loses that visual contract.`,
        graph: {
            X: `${t.file}:${t.line} — rsn value (.rsn / *Rsn / *_rsn) flows into ${surface} in ${t.context}`,
            Y: `the rendered cell shows just the name with no rank icon — looks broken next to other rows that use rsnTag`,
            Z: `no_separation — rsn rendering rules live both in the centralized rsnTag factory AND inline in feature code (two truths)`,
            W: `pages drift apart visually; some rsns get rank icons, others dont; clannies cant pattern-match identity at a glance; the centralized factory loses its enforcement power`,
        },
        remediation:
            `Replace the bare text with rsnTag({ rsn, rank }). If the surrounding ` +
            `factory expects a string (e.g. \`text:\` on a structured row), restructure ` +
            `the row so the cell receives an Instance: ` +
            `\`span({ classes: [PRIMARY_CLASS] }, [rsnTag({ rsn, rank })])\`. ` +
            `For prose embeds, drop rsnTag inline mid-sentence — it returns an ` +
            `inline-flex span that composes naturally. rsnTag lives at ` +
            `src/dom/factory/data/rsn-tag.ts.`,
        trace: t,
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Force rsn displays through the rsnTag factory; ban bare rsn text in factory calls + setText." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = normalizePath(context.filename || context.getFilename());
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        return {
            Property(node) {
                const key = propName(node.key);
                if (key !== "text") return;
                if (!valueContainsRsn(node.value)) return;
                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: { report: buildReport(t, "a factory's `text:` prop") },
                });
            },
            CallExpression(node) {
                const callee = node.callee;
                if (callee.type !== "MemberExpression") return;
                if (propName(callee.property) !== SET_TEXT_METHOD) return;
                const firstArg = node.arguments[0];
                if (!firstArg || !valueContainsRsn(firstArg)) return;
                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: { report: buildReport(t, "an Instance.setText() call") },
                });
            },
        };
    },
};
