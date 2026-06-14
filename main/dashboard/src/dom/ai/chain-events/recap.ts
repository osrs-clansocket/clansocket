import { details, div, pre, span, summary, type Instance } from "../../factory";
import { insertAboveThinking } from "./render";
import type { Payload } from "./summaries";
import {
    AI_BAR_CONTINUATION_BODY_CLASS,
    AI_BAR_CONTINUATION_LABEL_CLASS,
    AI_BAR_MSG_CLASS,
    AI_BAR_MSG_CONTINUATION_CLASS,
    AI_BAR_RECAP_GRID_CLASS,
    AI_BAR_RECAP_ROW_CLASS,
    AI_BAR_RECAP_TAG_CLASS,
    AI_BAR_RECAP_VAL_CLASS,
} from "../../../shared/constants/ai-bar-constants.js";

const RECAP_KEYS = ["Turn", "Before", "Current", "Next", "Learned", "Fixes", "Failures"];

interface RecapField {
    field: string;
    value: string;
}

function parseRecapLine(line: string): RecapField | null {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) return null;
    const field = line.slice(0, colonIdx);
    if (!RECAP_KEYS.includes(field)) return null;
    return { field, value: line.slice(colonIdx + 1).trim() };
}

function appendContinuation(result: RecapField[], line: string): RecapField[] {
    const last = result[result.length - 1];
    if (last) last.value += "\n" + line;
    return result;
}

function parseRecapFields(raw: string): RecapField[] {
    return raw.split("\n").reduce<RecapField[]>((acc, line) => {
        const match = parseRecapLine(line);
        return match ? [...acc, match] : appendContinuation(acc, line);
    }, []);
}

function recapFieldsFromObject(obj: Record<string, unknown>): RecapField[] {
    return RECAP_KEYS.map((field) => ({ field, value: String(obj[field] ?? "").trim() })).filter(
        (f) => f.value.length > 0,
    );
}

function resolveRecapFields(payload: Payload): { fields: RecapField[]; raw: string } {
    const recap = payload.recap;
    if (recap && typeof recap === "object") {
        const obj = recap as Record<string, unknown>;
        const fields = recapFieldsFromObject(obj);
        const raw = fields.map((f) => `${f.field}: ${f.value}`).join("\n");
        return { fields, raw };
    }
    const raw = String(recap ?? "");
    return { fields: parseRecapFields(raw), raw };
}

function buildRecapRow(f: RecapField): Instance {
    return div({ classes: [AI_BAR_RECAP_ROW_CLASS], context: null, meta: null }, [
        span({
            classes: [AI_BAR_RECAP_TAG_CLASS, `${AI_BAR_RECAP_TAG_CLASS}--${f.field.toLowerCase()}`],
            text: f.field,
            context: null,
            meta: null,
        }),
        span({ classes: [AI_BAR_RECAP_VAL_CLASS], text: f.value, context: null, meta: null }),
    ]);
}

function buildRecapGrid(fields: RecapField[]): Instance {
    return div({ classes: [AI_BAR_RECAP_GRID_CLASS], context: null, meta: null }, fields.map(buildRecapRow));
}

function buildRecapBody(fields: RecapField[], raw: string): Instance {
    if (fields.length > 0) return buildRecapGrid(fields);
    return pre({ classes: [AI_BAR_CONTINUATION_BODY_CLASS], text: raw, context: null, meta: null });
}

function renderContinuation(container: HTMLElement, payload: Payload, scroll: (c: HTMLElement) => void): void {
    const { fields, raw } = resolveRecapFields(payload);
    const det = details(
        {
            classes: [AI_BAR_MSG_CLASS, AI_BAR_MSG_CONTINUATION_CLASS],
            context: "expand the chain turn recap",
            meta: ["disclosure"],
        },
        [
            summary({
                classes: [AI_BAR_CONTINUATION_LABEL_CLASS],
                text: `Chain Turn — ${payload.turn ?? "continuing"}`,
                context: null,
                meta: null,
            }),
            buildRecapBody(fields, raw),
        ],
    );
    insertAboveThinking(container, det.el);
    scroll(container);
}

export { renderContinuation };
