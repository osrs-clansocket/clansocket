function hashNode(node, depth) {
    if (!node || depth > 8) return "";
    const d = depth || 0;
    switch (node.type) {
        case "Literal": return `L(${typeof node.value})`;
        case "Identifier": return `I`;
        case "MemberExpression":
            return node.computed
                ? `M[${hashNode(node.object, d + 1)}]`
                : `M(${hashNode(node.object, d + 1)}.${node.property.name ?? "_"})`;
        case "CallExpression": {
            const callee = node.callee;
            const calleeHash = callee.type === "Identifier"
                ? `f<${callee.name}>`
                : hashNode(callee, d + 1);
            return `C(${calleeHash}:${node.arguments.length})`;
        }
        case "BinaryExpression":
        case "LogicalExpression":
            return `${node.operator}(${hashNode(node.left, d + 1)},${hashNode(node.right, d + 1)})`;
        case "UnaryExpression":
            return `U${node.operator}(${hashNode(node.argument, d + 1)})`;
        case "ConditionalExpression":
            return `?:(${hashNode(node.test, d + 1)},${hashNode(node.consequent, d + 1)},${hashNode(node.alternate, d + 1)})`;
        case "ArrowFunctionExpression":
        case "FunctionExpression":
            return `F(${node.params.length}:${hashNode(node.body, d + 1)})`;
        case "BlockStatement":
            return `B(${node.body.map(s => hashNode(s, d + 1)).join(";")})`;
        case "ReturnStatement":
            return `R(${hashNode(node.argument, d + 1)})`;
        case "ExpressionStatement":
            return `E(${hashNode(node.expression, d + 1)})`;
        case "VariableDeclaration":
            return `V(${node.declarations.map(d2 => hashNode(d2.init, d + 1)).join(",")})`;
        case "IfStatement":
            return `IF(${hashNode(node.test, d + 1)}:${hashNode(node.consequent, d + 1)})`;
        case "AssignmentExpression":
            return `=(${hashNode(node.left, d + 1)},${hashNode(node.right, d + 1)})`;
        case "ObjectExpression":
            return `O(${node.properties.map(p => hashNode(p, d + 1)).join(",")})`;
        case "Property":
            return `P(${hashNode(node.key, d + 1)}:${hashNode(node.value, d + 1)})`;
        case "ArrayExpression":
            return `A(${node.elements.map(e => hashNode(e, d + 1)).join(",")})`;
        case "TemplateLiteral":
            return `T(${node.quasis.length})`;
        default:
            return node.type.charAt(0);
    }
}

function getObjKeys(node) {
    if (node.type !== "ObjectExpression") return [];
    return node.properties
        .filter(p => p.key)
        .map(p => p.key.name || p.key.value || "")
        .sort();
}

module.exports = { hashNode, getObjKeys };
