import type { LiveSource } from "../../../../dom/factory/live-ops";
import { subscribeProjectionMux } from "./stream-mux.js";

const TOPIC_DEFAULT = "browse";

export function projectionSource(params: Record<string, string | number | undefined>): LiveSource {
    const topic = typeof params.topic === "string" ? params.topic : TOPIC_DEFAULT;
    const rest: Record<string, string | number | undefined> = {};
    for (const [k, v] of Object.entries(params)) {
        if (k !== "topic") rest[k] = v;
    }
    return {
        subscribe(onSnapshot, onDelta): () => void {
            return subscribeProjectionMux({ topic, params: rest, onSnapshot, onDelta });
        },
    };
}
