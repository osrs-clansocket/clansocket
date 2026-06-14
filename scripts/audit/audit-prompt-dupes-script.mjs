#!/usr/bin/env node
// Audits cross-prompt content duplication. Builds the full system prompt for each mode (via
// the same buildSystemPrompt path the chat route uses — no AI provider call), splits by
// per-prompt `[PROMPT: <id>]` headers, shingles each prompt's content, and flags shingles
// appearing in 2+ different prompt ids within the same composed output. The composed prompt
// is what the AI actually receives; duplicates here = the AI ingests the same data twice.
//
// Usage (from clansocket-app/):
//   node scripts/audit/audit-prompt-dupes-script.mjs              # run dup scan across all modes
//   node scripts/audit/audit-prompt-dupes-script.mjs --show <mode>  # dump assembled prompt for <mode>
//
// Modes: action / guide / tracker. Chain modes: reactive (default) / continuous.

import { initializeDatabase } from "../../main/server/src/database/core/database.js";
import { buildSystemPrompt } from "../../main/server/src/ai/persona/prompt/index.js";

initializeDatabase();

const MODES = ["action", "guide", "tracker"];
const CHAIN_MODES = ["reactive", "continuous"];

const SHINGLE_WORDS = 8;
const MIN_SHINGLE_CHARS = 50;
const TOP_DUPS_PER_PAIR = 3;

const MOCK_CTX = {
    instruction: "audit",
    pageState: null,
    extraContextIds: [],
    siteAccountId: "audit-mock",
    priorRawResponse: null,
    priorUserMessage: null,
    history: [],
    profile: null,
};

async function build(mode, chainMode) {
    return buildSystemPrompt(
        MOCK_CTX.instruction,
        mode,
        MOCK_CTX.pageState,
        MOCK_CTX.extraContextIds,
        MOCK_CTX.siteAccountId,
        MOCK_CTX.priorRawResponse,
        MOCK_CTX.priorUserMessage,
        chainMode,
        MOCK_CTX.history,
        MOCK_CTX.profile,
    );
}

function splitByPromptHeader(assembled) {
    const sections = new Map();
    const lines = assembled.split("\n");
    let currentId = null;
    let currentBuf = [];
    for (const line of lines) {
        if (line.startsWith("[PROMPT: ") && line.endsWith("]")) {
            if (currentId !== null) sections.set(currentId, currentBuf.join("\n"));
            currentId = line.slice("[PROMPT: ".length, -1);
            currentBuf = [];
        } else {
            currentBuf.push(line);
        }
    }
    if (currentId !== null) sections.set(currentId, currentBuf.join("\n"));
    return sections;
}

function shinglesOf(text) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const out = [];
    for (let i = 0; i + SHINGLE_WORDS <= words.length; i++) {
        const shingle = words.slice(i, i + SHINGLE_WORDS).join(" ");
        if (shingle.length >= MIN_SHINGLE_CHARS) out.push(shingle);
    }
    return out;
}

function scanDupes(sections) {
    const seen = new Map();
    for (const [id, content] of sections.entries()) {
        const uniqShingles = new Set(shinglesOf(content));
        for (const sh of uniqShingles) {
            if (!seen.has(sh)) seen.set(sh, new Set());
            seen.get(sh).add(id);
        }
    }
    const dups = [];
    for (const [sh, ids] of seen.entries()) {
        if (ids.size >= 2) dups.push({ shingle: sh, ids: [...ids].sort() });
    }
    return dups;
}

function pairKey(ids) {
    return ids.join(" ⇄ ");
}

function reportDupes(label, sections) {
    const dups = scanDupes(sections);
    if (dups.length === 0) {
        process.stdout.write(`\n[${label}] CLEAN — 0 cross-prompt shingles.\n`);
        return 0;
    }
    const byPair = new Map();
    for (const { shingle, ids } of dups) {
        const key = pairKey(ids);
        if (!byPair.has(key)) byPair.set(key, []);
        byPair.get(key).push(shingle);
    }
    process.stdout.write(`\n[${label}] ${dups.length} duplicated shingle(s) across ${byPair.size} prompt pair(s):\n`);
    const sorted = [...byPair.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [pair, shingles] of sorted) {
        process.stdout.write(`  ${pair}: ${shingles.length} shingle(s)\n`);
        for (const sh of shingles.slice(0, TOP_DUPS_PER_PAIR)) {
            process.stdout.write(`    "${sh.slice(0, 100)}${sh.length > 100 ? "…" : ""}"\n`);
        }
        if (shingles.length > TOP_DUPS_PER_PAIR) {
            process.stdout.write(`    ... +${shingles.length - TOP_DUPS_PER_PAIR} more\n`);
        }
    }
    return dups.length;
}

async function showMode(mode) {
    const result = await build(mode, "reactive");
    process.stdout.write(`=== assembled prompt for mode=${mode} (reactive) ===\n`);
    process.stdout.write(`loadedIds: ${result.loadedIds.join(", ")}\n`);
    process.stdout.write(`total chars: ${result.system.length}\n\n`);
    process.stdout.write(result.system);
    process.stdout.write("\n");
}

async function runAudit() {
    let total = 0;
    for (const mode of MODES) {
        for (const chainMode of CHAIN_MODES) {
            const result = await build(mode, chainMode);
            const sections = splitByPromptHeader(result.system);
            total += reportDupes(`mode=${mode}, chain=${chainMode} — ${sections.size} sections`, sections);
        }
    }
    process.stdout.write(`\n=== TOTAL ${total} duplicated shingle(s) across all mode×chain combinations ===\n`);
    process.exit(total > 0 ? 1 : 0);
}

const showIdx = process.argv.indexOf("--show");
if (showIdx > 0 && process.argv[showIdx + 1]) {
    await showMode(process.argv[showIdx + 1]);
    process.exit(0);
} else {
    await runAudit();
}
