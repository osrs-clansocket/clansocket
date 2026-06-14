export interface ActionResultBody {
    verb: string;
    target: string | null;
    success: boolean;
    error?: string;
    meta?: Record<string, unknown>;
}

export type SendKind = "user" | "action-feedback";

function formatActionResultLine(r: ActionResultBody): string {
    const status = r.success ? "ok" : `failed: ${r.error ?? "unknown"}`;
    const target = r.target ?? "(no target)";
    const meta = r.meta ? ` meta=${JSON.stringify(r.meta)}` : "";
    return `  - ${r.verb} target=${target} → ${status}${meta}`;
}

export function buildActionFeedbackText(
    results: ActionResultBody[] | undefined,
    priorChainId: string | undefined,
): string {
    const lines: string[] = ["[DOM ACTION RESULTS]"];
    if (!results || results.length === 0) {
        lines.push("  (no action results provided)");
    } else {
        for (const r of results) lines.push(formatActionResultLine(r));
    }
    lines.push("");
    lines.push("[PAGE STATE UPDATED]");
    lines.push("Fresh pageState is attached to this turn. Read it before deciding the next move.");
    if (priorChainId !== undefined && priorChainId.length > 0) {
        lines.push("");
        lines.push(`[PRIOR CHAIN: ${priorChainId}]`);
        lines.push(
            `Query \`chain.chain_steps\` filtered by chain_id='${priorChainId}' if u need to recall earlier turn detail.`,
        );
    }
    return lines.join("\n");
}
