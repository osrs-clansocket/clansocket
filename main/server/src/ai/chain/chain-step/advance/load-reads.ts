import { pinnedContext } from "../../../memory/pinned-context.js";
import { promptLoader } from "../../../persona/prompt-loader/index.js";
import { formatMetaFacet, metaFacetPrefix } from "../../../persona/prompt/format-state.js";
import { resolvePinItems } from "../helpers.js";
import type { ChainEvent } from "../types.js";

interface ReadContextInput {
    readIds: string[];
    siteAccountId: string;
    pageState: Record<string, unknown> | null;
    history: { role: "user" | "assistant"; content: string; timestamp?: number }[] | undefined;
}

// a read id prefixed `dom:` is a meta-tag facet query — expand the matching operable elements'
// context from the pageState already held this turn. everything else is a prompt-file id.
function injectDomFacet(
    id: string,
    pageState: Record<string, unknown> | null,
    injections: string[],
    events: ChainEvent[],
): void {
    const tag = id.slice(metaFacetPrefix().length);
    const content = pageState
        ? formatMetaFacet(pageState, tag)
        : `No page state available — cannot read dom facet "${tag}".`;
    injections.push(`[DOM FACET: ${tag}]\n${content}`);
    events.push({ type: "read", payload: { id, content } });
}

export async function loadReadContext(
    input: ReadContextInput,
    injections: string[],
    events: ChainEvent[],
): Promise<void> {
    if (input.readIds.length === 0) return;
    const prefix = metaFacetPrefix();
    const fileIds: string[] = [];
    for (const id of input.readIds) {
        if (id.startsWith(prefix)) injectDomFacet(id, input.pageState, injections, events);
        else fileIds.push(id);
    }
    if (fileIds.length === 0) return;
    await promptLoader.init();
    const files = promptLoader.resolveByIds(fileIds, {
        siteAccountId: input.siteAccountId,
        pageState: input.pageState,
        history: input.history,
    });
    const autoPins = promptLoader.getAutoPinIds();
    const toPin: string[] = [];
    for (const f of files) {
        injections.push(`[PROMPT: ${f.id}]\n${f.content}`);
        events.push({ type: "read", payload: { id: f.id, content: f.content } });
        if (autoPins.includes(f.id)) toPin.push(f.id);
    }
    if (toPin.length > 0) {
        pinnedContext.pin(input.siteAccountId, toPin, { auto: true });
        events.push({
            type: "pin",
            payload: { ids: toPin, auto: true, items: resolvePinItems(toPin, input.siteAccountId) },
        });
    }
}
