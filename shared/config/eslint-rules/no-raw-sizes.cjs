"use strict";

const path = require("path");

const GATED_PROPS_EXACT = new Set([
    "gap",
    "row-gap",
    "column-gap",
    "line-height",
    "letter-spacing",
    "border-width",
    "z-index",
    "opacity",
    "filter",
    "backdrop-filter",
    "box-shadow",
]);
const GATED_PROP_PREFIXES = ["font-size", "padding", "margin", "border-radius"];

const PURE_NUMBER_PROPS = new Set(["z-index", "opacity"]);
const FILTER_PROPS = new Set(["filter", "backdrop-filter"]);
const BOX_SHADOW_PROPS = new Set(["box-shadow"]);

const ALLOWED_FUNCTIONS = new Set([
    "var",
    "env",
    "constant",
    "calc",
    "min",
    "max",
    "clamp",
]);
const BLUR_FN = new Set(["blur"]);

const ALLOWED_NUMBER_VALUES = new Set(["0", "1"]);

function isGated(prop) {
    if (GATED_PROPS_EXACT.has(prop)) return true;
    for (const pre of GATED_PROP_PREFIXES) {
        if (prop === pre || prop.startsWith(pre + "-")) return true;
    }
    return false;
}

function toPosix(p) {
    return p.split(path.sep).join("/");
}

function isExcluded(filename) {
    const norm = toPosix(filename);
    if (norm.endsWith("/styles/tokens/tokens.css")) return true;
    if (norm.endsWith("/styles/tokens.css")) return true;
    if (norm.endsWith("/styles/generated-icon-colors.css")) return true;
    return false;
}

function isAllowedFunction(node) {
    return node && node.type === "Function" && ALLOWED_FUNCTIONS.has(node.name.toLowerCase());
}

function isZeroNode(node) {
    return (node.type === "Number" || node.type === "Dimension" || node.type === "Percentage")
        && node.value === "0";
}

function formatRaw(node) {
    if (node.type === "Dimension") return node.value + node.unit;
    if (node.type === "Percentage") return node.value + "%";
    return node.value;
}

function findRawLength(container) {
    if (!container || !container.children) return null;
    for (const child of container.children) {
        if (isAllowedFunction(child)) continue;
        if (child.type === "Function") {
            const nested = findRawLength(child);
            if (nested) return nested;
            continue;
        }
        if (child.type === "Dimension") {
            if (isZeroNode(child)) continue;
            return child;
        }
        if (child.type === "Percentage") {
            if (isZeroNode(child)) continue;
            return child;
        }
        if (child.type === "Number") {
            if (isZeroNode(child)) continue;
            return child;
        }
    }
    return null;
}

function findRawPureNumber(value) {
    for (const child of value.children) {
        if (child.type === "Function") {
            if (ALLOWED_FUNCTIONS.has(child.name.toLowerCase())) return null;
            continue;
        }
        if (child.type !== "Number") continue;
        if (ALLOWED_NUMBER_VALUES.has(child.value)) continue;
        return child;
    }
    return null;
}

function findRawBlurArg(value) {
    for (const child of value.children) {
        if (child.type !== "Function") continue;
        const fname = child.name.toLowerCase();
        if (ALLOWED_FUNCTIONS.has(fname)) continue;
        if (!BLUR_FN.has(fname)) continue;
        const inner = findRawLength(child);
        if (inner) return inner;
    }
    return null;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow raw size literals on token-gated CSS properties. Sizes must use var(--fs-*|--sp-*|--ls-*|--radius-*|--z-*|--opacity-*|--blur-*|--shadow-*) tokens. If no close neighbor exists in tokens.css, add a new tier there — never inline a raw value in a component.",
            url: "https://github.com/osrs-clansocket/clansocket/blob/main/CLAUDE.md",
        },
        schema: [],
        messages: {
            rawLength:
                'Raw size literal "{{raw}}" in {{prop}}. Use a token (var(--fs-*|--sp-*|--ls-*|--radius-*)). If no close neighbor in tokens.css, add a new tier there — never inline a raw value in a component.',
            rawPureNumber:
                'Raw pure number "{{raw}}" in {{prop}}. Use a token (var(--z-*) for z-index, var(--opacity-*) for opacity).',
            rawBlur:
                'Raw length "{{raw}}" inside blur() of {{prop}}. Use var(--blur-*) — never inline a raw blur radius.',
            rawShadow:
                'Raw length "{{raw}}" inside box-shadow. Use var(--shadow-*) — never inline raw shadow offsets/blur/spread.',
        },
    },
    create(context) {
        const filename = context.filename || (context.getFilename && context.getFilename());
        if (!filename || !filename.toLowerCase().endsWith(".css")) return {};
        if (isExcluded(filename)) return {};

        return {
            Declaration(node) {
                const prop = node.property.toLowerCase();
                if (!isGated(prop)) return;
                if (!node.value || node.value.type !== "Value") return;

                if (PURE_NUMBER_PROPS.has(prop)) {
                    const bad = findRawPureNumber(node.value);
                    if (bad) {
                        context.report({
                            loc: bad.loc || node.loc,
                            messageId: "rawPureNumber",
                            data: { raw: formatRaw(bad), prop: node.property },
                        });
                    }
                    return;
                }

                if (FILTER_PROPS.has(prop)) {
                    const bad = findRawBlurArg(node.value);
                    if (bad) {
                        context.report({
                            loc: bad.loc || node.loc,
                            messageId: "rawBlur",
                            data: { raw: formatRaw(bad), prop: node.property },
                        });
                    }
                    return;
                }

                if (BOX_SHADOW_PROPS.has(prop)) {
                    const bad = findRawLength(node.value);
                    if (bad) {
                        context.report({
                            loc: bad.loc || node.loc,
                            messageId: "rawShadow",
                            data: { raw: formatRaw(bad), prop: node.property },
                        });
                    }
                    return;
                }

                const bad = findRawLength(node.value);
                if (bad) {
                    context.report({
                        loc: bad.loc || node.loc,
                        messageId: "rawLength",
                        data: { raw: formatRaw(bad), prop: node.property },
                    });
                }
            },
        };
    },
};
