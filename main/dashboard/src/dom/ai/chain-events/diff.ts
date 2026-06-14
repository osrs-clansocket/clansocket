import { div, span, type Instance } from "../../factory";
import {
    AI_BAR_DIFF_CLASS,
    AI_BAR_DIFF_LINE_CLASS,
    AI_BAR_DIFF_MARKER_CLASS,
    AI_BAR_DIFF_TEXT_CLASS,
} from "../../../shared/constants/ai-bar-constants.js";

const DIFF_CONTEXT = "context";
const DIFF_ADD = "add";
const DIFF_REMOVE = "remove";

type DiffKind = typeof DIFF_CONTEXT | typeof DIFF_ADD | typeof DIFF_REMOVE;

interface DiffLine {
    kind: DiffKind;
    text: string;
}

function buildLcsTable(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            const matched = a[i] === b[j];
            lcs[i]![j] = matched ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
        }
    }
    return lcs;
}

function backtrackDiff(a: string[], b: string[], lcs: number[][]): DiffLine[] {
    const out: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        const matched = lcs[i]![j]! === lcs[i + 1]![j + 1]! + 1;
        if (matched) {
            out.push({ kind: DIFF_CONTEXT, text: a[i]! });
            i++;
            j++;
        } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
            out.push({ kind: DIFF_REMOVE, text: a[i]! });
            i++;
        } else {
            out.push({ kind: DIFF_ADD, text: b[j]! });
            j++;
        }
    }
    while (i < a.length) out.push({ kind: DIFF_REMOVE, text: a[i++]! });
    while (j < b.length) out.push({ kind: DIFF_ADD, text: b[j++]! });
    return out;
}

function lineDiff(before: string, after: string): DiffLine[] {
    const a = before.split("\n");
    const b = after.split("\n");
    return backtrackDiff(a, b, buildLcsTable(a, b));
}

const MARKER_FOR_KIND: Record<DiffKind, string> = {
    [DIFF_ADD]: "+",
    [DIFF_REMOVE]: "-",
    [DIFF_CONTEXT]: " ",
};

function marker(kind: DiffKind): string {
    return MARKER_FOR_KIND[kind];
}

function buildDiffLine(line: DiffLine): Instance {
    return div(
        { classes: [AI_BAR_DIFF_LINE_CLASS, `${AI_BAR_DIFF_LINE_CLASS}--${line.kind}`], context: null, meta: null },
        [
            span({ classes: [AI_BAR_DIFF_MARKER_CLASS], text: marker(line.kind), context: null, meta: null }),
            span({ classes: [AI_BAR_DIFF_TEXT_CLASS], text: line.text, context: null, meta: null }),
        ],
    );
}

function buildDiffBlock(lines: DiffLine[]): Instance {
    return div({ classes: [AI_BAR_DIFF_CLASS], context: null, meta: null }, lines.map(buildDiffLine));
}

function buildDiff(before: string, after: string): Instance {
    return buildDiffBlock(lineDiff(before, after));
}

function buildSingleSide(content: string, kind: DiffKind): Instance {
    const lines = content.split("\n").map((text) => ({ kind, text }));
    return buildDiffBlock(lines);
}

export { buildDiff, buildSingleSide, DIFF_ADD, DIFF_REMOVE };
