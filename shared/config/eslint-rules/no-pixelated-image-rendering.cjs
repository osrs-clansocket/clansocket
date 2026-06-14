"use strict";

const TARGET_PROPERTY = "image-rendering";
const BANNED_VALUE = "pixelated";
const NOT_FOUND = -1;

function getSourceCode(context) {
    return context.sourceCode || (context.getSourceCode && context.getSourceCode());
}

function valueText(node, sourceCode) {
    if (!sourceCode || !node.value || !node.value.loc) return "";
    const start = node.value.loc.start.offset;
    const end = node.value.loc.end.offset;
    return sourceCode.text.slice(start, end);
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Ban `image-rendering: pixelated`. Distorts OSRS sprites + raster assets at any scale where the source resolution doesnt match the display size. Default browser smoothing is the platform standard.",
        },
        schema: [],
        messages: {
            banned:
                "`image-rendering: pixelated` is banned. Drop the declaration to inherit the browser's default smooth rendering, or use `auto` / `crisp-edges` if a specific render mode is required for a particular asset family.",
        },
    },
    create(context) {
        const sourceCode = getSourceCode(context);
        return {
            Declaration(node) {
                if (node.property !== TARGET_PROPERTY) return;
                const text = valueText(node, sourceCode).toLowerCase();
                if (text.indexOf(BANNED_VALUE) === NOT_FOUND) return;
                context.report({ loc: node.loc, messageId: "banned" });
            },
        };
    },
};
