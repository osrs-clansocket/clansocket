import type { ProfileContext, SessionEntry } from "./types.js";

function formatSessionEntry(e: SessionEntry): string {
    const parts: string[] = [`#${e.turn} they: ${e.they}`, `    i: ${e.i}`];
    if (e.learned) parts.push(`    learned: ${e.learned}`);
    if (e.fix) parts.push(`    fix: ${e.fix}`);
    if (e.failure) parts.push(`    failure: ${e.failure}`);
    return parts.join("\n");
}

export function formatClientProfile(ctx: ProfileContext, windowTurns: number): string {
    const blocks: string[] = [];
    const idKeys = Object.keys(ctx.identity);
    if (idKeys.length > 0) {
        blocks.push("identity:");
        for (const k of idKeys) blocks.push(`  ${k}: ${ctx.identity[k]}`);
    } else {
        blocks.push("identity: (empty)");
    }
    const recent = ctx.session.slice(-windowTurns);
    if (recent.length > 0) {
        blocks.push("\nsession (last turns — append-only log):");
        for (const e of recent) blocks.push(formatSessionEntry(e));
    } else {
        blocks.push("\nsession: (empty)");
    }
    blocks.push(`\nfocus: ${ctx.focus ?? "(none)"}`);
    return blocks.join("\n");
}
