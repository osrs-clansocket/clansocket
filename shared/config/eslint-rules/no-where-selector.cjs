"use strict";

const TARGETED_PSEUDOS = new Set(["where", "is"]);

function isFunctionalPseudo(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type !== "FunctionalPseudoSelector" && node.type !== "PseudoClassSelector") return null;
    const name = node.name ? String(node.name).toLowerCase() : null;
    if (name && TARGETED_PSEUDOS.has(name)) return name;
    return null;
}

function collectChildren(node) {
    if (!node || typeof node !== "object") return [];
    const out = [];
    if (Array.isArray(node.children)) {
        for (const c of node.children) out.push(c);
    } else if (node.children && typeof node.children.toArray === "function") {
        for (const c of node.children.toArray()) out.push(c);
    }
    if (node.body) out.push(node.body);
    if (node.prelude) out.push(node.prelude);
    return out;
}

function containsClassSelector(node) {
    if (!node || typeof node !== "object") return false;
    if (node.type === "ClassSelector") return true;
    const kids = collectChildren(node);
    for (const k of kids) {
        if (containsClassSelector(k)) return true;
    }
    return false;
}

function walkSelector(node, onMatch) {
    if (!node || typeof node !== "object") return;
    const name = isFunctionalPseudo(node);
    if (name && containsClassSelector(node)) {
        onMatch(name, node);
    }
    for (const child of collectChildren(node)) walkSelector(child, onMatch);
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                ":where() / :is() containing class selectors are zero-specificity grouping hacks that bypass the file=scope BEM contract enforced by lvi/no-mixed-css-scopes. Forbidden because they let cross-block rules collapse into a single rule without the proper DOM-class refactor. Use a shared utility/component class added via the DOM factory instead. Element-only :where(body) / :where(:root) are allowed (specificity baseline, not BEM bypass).",
        },
        schema: [],
        messages: {
            forbidden:
                ":{{name}}() containing class selectors is a scope-bypass hack. Refactor the affected elements to share a class via the DOM factory and put the shared rule under a component/utility file. See CLAUDE.md invariant 12c.",
        },
    },
    create(context) {
        return {
            Rule(node) {
                walkSelector(node.prelude, (name, pseudo) => {
                    context.report({
                        node: pseudo,
                        loc: pseudo.loc ?? node.loc,
                        messageId: "forbidden",
                        data: { name },
                    });
                });
            },
        };
    },
};
