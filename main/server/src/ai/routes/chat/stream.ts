import { streamText } from "ai";
import type { Response } from "express";
import { buildLanguageModel } from "./llm.js";

export function writeSseEvent(res: Response, payload: Record<string, unknown>): boolean {
    if (res.writableEnded || res.destroyed) return false;
    return res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function writeSseComment(res: Response, comment: string): void {
    if (res.writableEnded || res.destroyed) return;
    res.write(`: ${comment}\n\n`);
}

export function sleep(ms: number, abortRef: { aborted: boolean }): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = (): void => {
            if (abortRef.aborted || Date.now() - start >= ms) resolve();
            else setTimeout(tick, Math.min(100, ms - (Date.now() - start)));
        };
        setTimeout(tick, Math.min(100, ms));
    });
}

export async function streamLlmCall(
    apiKey: string,
    provider: string,
    model: string,
    maxTokens: number,
    system: string,
    messages: { role: "user" | "assistant"; content: string }[],
    onDelta: (text: string) => void,
    abortRef: { aborted: boolean },
): Promise<string> {
    const languageModel = buildLanguageModel(provider, apiKey, model);
    const result = streamText({
        model: languageModel,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        maxOutputTokens: maxTokens,
    });
    let text = "";
    for await (const chunk of result.textStream) {
        if (abortRef.aborted) break;
        text += chunk;
        onDelta(chunk);
    }
    return text;
}
