const { getModuleForFile, getLoggerImport, getModuleConfig } = require("../resolve-paths.cjs");
const { build4DReport, shortFile, getContext } = require("./report-builder.cjs");

const METHOD_MAP = {
    log: "logger.info",
    error: "logger.error",
    warn: "logger.warn",
    info: "logger.info",
    debug: "logger.debug",
};

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Enforce structured logger — no raw console" },
        fixable: "code",
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw);
        const modConfig = mod ? getModuleConfig(mod) : null;
        const file = shortFile(raw);
        const src = context.sourceCode || context.getSourceCode();
        const loggerImport = getLoggerImport(raw);

        if (raw.includes("/logger/") || raw.endsWith("logger.js") || raw.endsWith("logger.ts")) { return {}; }

        return {
            MemberExpression(node) {
                if (node.object.type !== "Identifier" || node.object.name !== "console") { return; }
                if (node.property.type !== "Identifier") { return; }
                const method = node.property.name;
                if (!METHOD_MAP[method]) { return; }

                const replacement = METHOD_MAP[method];
                const callNode = node.parent;
                const ctx = getContext(node);
                const modName = mod || "unknown";
                const modRoot = modConfig?.root || "unknown";
                const errorCtx = method === "error"
                    ? `For errors in [${modName}], pass 4D context: logger.error(message, { X, Y, Z, W, remediation, stack: err.stack }).`
                    : `For info/warn in [${modName}], use a semantic single-line narrative: ${replacement}(message).`;

                context.report({
                    node: callNode || node,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "no-console",
                            narrative: `console.${method}() in [${modName}] at ${file}:${node.loc.start.line}. Raw console output is unstructured. This codebase requires @clansocket/logger — errors carry 4D context, infos are semantic narratives.`,
                            graph: {
                                X: `${modRoot}/${file}:${node.loc.start.line} — console.${method}() in ${ctx} [${modName}]`,
                                Y: `output goes to stdout/stderr with zero structure — no tooling can parse it`,
                                Z: `no_silent (MakeErrorsPartOfLanguage) — all output must be structured and machine-processable`,
                                W: `unstructured logs in [${modName}] hide failure context — remediation requires manual trace reconstruction`,
                            },
                            remediation: `Replace console.${method}() with ${replacement}() in [${modName}]. Add import: ${loggerImport}. ${errorCtx}`,
                            trace: { file: `${modRoot}/${file}`, line: String(node.loc.start.line), col: String(node.loc.start.column), context: ctx, module: modName, related: [] },
                        }),
                    },
                    fix(fixer) {
                        const objToken = src.getFirstToken(node.object);
                        const propToken = src.getFirstToken(node.property);
                        if (!objToken || !propToken) { return null; }
                        const [loggerNs, loggerMethod] = replacement.split(".");
                        return [
                            fixer.replaceText(objToken, loggerNs),
                            fixer.replaceText(propToken, loggerMethod),
                        ];
                    },
                });
            },
        };
    },
};
