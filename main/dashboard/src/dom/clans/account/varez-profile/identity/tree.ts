export interface TreeNode {
    name: string;
    fullKey: string | null;
    value: string | null;
    children: TreeNode[];
}

export function emptyNode(name: string): TreeNode {
    return { name, fullKey: null, value: null, children: [] };
}

export function buildTree(identity: Record<string, string>): TreeNode {
    const root = emptyNode("");
    const keys = Object.keys(identity).sort();
    for (const key of keys) {
        const segments = key.split(".");
        let node = root;
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i]!;
            const isLast = i === segments.length - 1;
            let child = node.children.find((c) => c.name === seg);
            if (!child) {
                child = emptyNode(seg);
                node.children.push(child);
            }
            if (isLast) {
                child.fullKey = key;
                child.value = identity[key]!;
            }
            node = child;
        }
    }
    return root;
}

export function buildTreeLink(depth: number, isLast: boolean): string {
    if (depth === 0) return "";
    let prefix = "";
    for (let i = 0; i < depth - 1; i++) prefix += "│  ";
    prefix += isLast ? "└─ " : "├─ ";
    return prefix;
}
