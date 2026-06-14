export interface DependencyEdge {
    change_id: string;
    dependency_change_id: string;
}

interface GraphState {
    inDegree: Map<string, number>;
    dependents: Map<string, string[]>;
}

export class CyclicDependencyError extends Error {
    constructor() {
        super("Cyclic dependency in draft session — cannot topologically sort");
        this.name = "CyclicDependencyError";
    }
}

function buildGraph(changeIds: string[], deps: DependencyEdge[]): GraphState {
    const ids = new Set(changeIds);
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();
    for (const id of changeIds) {
        inDegree.set(id, 0);
        dependents.set(id, []);
    }
    for (const dep of deps) {
        if (!ids.has(dep.change_id) || !ids.has(dep.dependency_change_id)) continue;
        inDegree.set(dep.change_id, (inDegree.get(dep.change_id) ?? 0) + 1);
        dependents.get(dep.dependency_change_id)!.push(dep.change_id);
    }
    return { inDegree, dependents };
}

function findRoots(inDegree: Map<string, number>): string[] {
    const roots: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
        if (deg === 0) roots.push(id);
    }
    return roots;
}

function relaxChildren(id: string, graph: GraphState, queue: string[]): void {
    for (const child of graph.dependents.get(id) ?? []) {
        const next = (graph.inDegree.get(child) ?? 0) - 1;
        graph.inDegree.set(child, next);
        if (next === 0) queue.push(child);
    }
}

export function sortChangesByDeps(changeIds: string[], deps: DependencyEdge[]): string[] {
    const graph = buildGraph(changeIds, deps);
    const queue = findRoots(graph.inDegree);
    const result: string[] = [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        result.push(id);
        relaxChildren(id, graph, queue);
    }
    if (result.length !== changeIds.length) throw new CyclicDependencyError();
    return result;
}
