import type { DeltaBatch, RowDelta } from "@clansocket/realtime";
import type { LiveSource } from "../../../dom/factory/live-ops";
import { clansClient, type ClanAuditEntry } from "../clans-client/index.js";
import {
    type AuditFilters,
    type ClusterRow,
    clusterIncrement,
    clusterMatches,
    makeClusterRow,
    matchesAuditFilters,
} from "./cluster-defs.js";

const TOPIC = "clan-audit";

export interface AuditFeed {
    source: LiveSource;
    loadMore: () => Promise<ClusterRow[]>;
    hasMore: () => boolean;
}

export interface AuditFeedOptions {
    slug: string;
    filters: AuditFilters;
    limit: number;
    onEntry: (entry: ClanAuditEntry) => void;
    onLoaded: () => void;
}

export function createAuditFeed(opts: AuditFeedOptions): AuditFeed {
    const { slug, filters, limit, onEntry, onLoaded } = opts;
    const clusters: ClusterRow[] = [];
    let seq = 0;
    let nextBefore: number | null = null;
    let hasMoreFlag = false;
    let emitDelta: ((batch: DeltaBatch) => void) | null = null;

    const pushDelta = (row: ClusterRow): void => {
        seq += 1;
        const delta: RowDelta = { topic: TOPIC, seq, key: row.key, op: "upsert", row };
        emitDelta?.({ topic: TOPIC, fromSeq: seq, toSeq: seq, deltas: [delta] });
    };

    const foldTail = (entry: ClanAuditEntry): void => {
        const tail = clusters[clusters.length - 1];
        if (tail && clusterMatches(tail, entry)) {
            tail.count += clusterIncrement(entry);
            tail.ids.push(entry.id);
            return;
        }
        clusters.push(makeClusterRow(entry));
    };

    const ingestLive = (entry: ClanAuditEntry): void => {
        if (clusters.some((c) => c.ids.includes(entry.id))) return;
        onEntry(entry);
        const head = clusters[0];
        if (head && clusterMatches(head, entry)) {
            head.head = entry;
            head.count += clusterIncrement(entry);
            head.ids.unshift(entry.id);
            pushDelta(head);
            return;
        }
        const cluster = makeClusterRow(entry);
        clusters.unshift(cluster);
        pushDelta(cluster);
    };

    const fetchPage = (
        before: number | undefined,
    ): Promise<{ entries: ClanAuditEntry[]; hasMore: boolean; nextBefore: number | null }> =>
        clansClient.listClanAudit(slug, {
            before,
            after: filters.afterTs,
            limit,
            kindPrefix: filters.kindPrefix ?? undefined,
            kindExclude: filters.kindExclude ?? undefined,
        });

    return {
        hasMore: () => hasMoreFlag,
        loadMore: async (): Promise<ClusterRow[]> => {
            if (!hasMoreFlag || nextBefore === null) return [];
            const page = await fetchPage(nextBefore);
            const originalLen = clusters.length;
            const tailBefore = clusters[originalLen - 1];
            const tailCountBefore = tailBefore?.count ?? 0;
            for (const entry of page.entries) {
                onEntry(entry);
                foldTail(entry);
            }
            nextBefore = page.nextBefore;
            hasMoreFlag = page.hasMore;
            if (tailBefore && tailBefore.count !== tailCountBefore) pushDelta(tailBefore);
            return clusters.slice(originalLen);
        },
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                emitDelta = onDelta;
                let streamClose: (() => void) | null = null;
                let closed = false;
                void (async () => {
                    const page = await fetchPage(undefined);
                    if (closed) return;
                    for (const entry of page.entries) {
                        onEntry(entry);
                        foldTail(entry);
                    }
                    nextBefore = page.nextBefore;
                    hasMoreFlag = page.hasMore;
                    onSnapshot({ topic: TOPIC, seq: 0, rows: clusters.slice() });
                    onLoaded();
                    streamClose = clansClient.openClanAuditStream(slug, (entry) => {
                        if (matchesAuditFilters(entry, filters)) ingestLive(entry);
                    });
                })();
                return () => {
                    closed = true;
                    streamClose?.();
                    emitDelta = null;
                };
            },
        },
    };
}
