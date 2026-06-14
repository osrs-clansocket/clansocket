import type { ProjectionTopic } from "./projection.js";

// named projection topics. each builder parses the request query it needs and returns a
// topic def (or null if the params are invalid). the SSE route dispatches by name, so
// adding a live surface = registering a builder, no route change.
export type TopicBuilder = (siteAccountId: string, query: Record<string, unknown>) => ProjectionTopic | null;

const builders = new Map<string, TopicBuilder>();

export function registerTopic(name: string, builder: TopicBuilder): void {
    builders.set(name, builder);
}

export function resolveTopic(
    name: string,
    siteAccountId: string,
    query: Record<string, unknown>,
): ProjectionTopic | null {
    const builder = builders.get(name);
    return builder ? builder(siteAccountId, query) : null;
}
