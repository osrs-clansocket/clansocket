import { ACTIVE_SLICE, type Chain, type ChainStep } from "./types.js";

function formatStep(step: ChainStep): string[] {
    const lines: string[] = [`Turn ${step.step}:`];
    if (step.loadedContext.length > 0) {
        lines.push(`  Loaded context: [${step.loadedContext.join(", ")}]`);
    }
    if (step.reads.length > 0) {
        lines.push(`  Read this turn: [${step.reads.join(", ")}]`);
    }
    if (step.queries.length > 0) {
        lines.push(`  Queries:`);
        for (const q of step.queries) {
            const sqlPreview = q.sql.length > 120 ? `${q.sql.slice(0, 120)}…` : q.sql;
            const status = q.error ? `error: ${q.error}` : `${q.rows ?? 0} row(s)`;
            lines.push(`    - [${q.db}] ${sqlPreview} → ${status}`);
        }
    }
    if (step.recap) {
        const recapParts: string[] = [];
        for (const [k, v] of Object.entries(step.recap)) {
            if (v && typeof v === "string") recapParts.push(`${k}: ${v}`);
        }
        if (recapParts.length > 0) {
            lines.push(`  Recap: ${recapParts.join(" | ")}`);
        }
    }
    if (step.message) {
        const msgPreview = step.message.length > 200 ? `${step.message.slice(0, 200)}…` : step.message;
        lines.push(`  Message/reasoning: ${msgPreview}`);
    }
    if (step.learning) {
        lines.push(`  Learning: ${step.learning}`);
    }
    return lines;
}

export function formatChain(chain: Chain): string {
    if (chain.steps.length === 0) return "";
    const total = chain.steps.length;
    const recent = chain.steps.slice(-ACTIVE_SLICE);
    const olderCount = total - recent.length;
    const lines: string[] = [`Chain: ${chain.id} — ${total} turn(s) completed so far. Showing last ${recent.length}.`];
    if (olderCount > 0) {
        const plural = olderCount === 1 ? "step" : "steps";
        lines.push(
            `(${olderCount} earlier ${plural} not shown — query \`chain.chain_steps\` filtered by chain_id='${chain.id}' to recall.)`,
        );
    }
    for (const step of recent) lines.push(...formatStep(step));
    return lines.join("\n");
}
