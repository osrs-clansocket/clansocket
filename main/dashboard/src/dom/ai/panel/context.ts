import { button, createInstance, div, span, type Instance } from "../../factory";
import { aiClient } from "../../../ai/client";

const CTX_CLASS = "ai-bar__context";
const TAG_CLASS = "ai-bar__ctx-tag";
const CLOSE_CLASS = "ai-bar__ctx-close";

function buildCtxTag(id: string): Instance {
    const closeBtn = button({
        classes: [CLOSE_CLASS],
        compact: true,
        text: "×",
        data: { unpin: id },
        context: "unpin this ai context tag",
        meta: ["action"],
    });
    return span({ classes: [TAG_CLASS], text: id, context: null, meta: null }, [closeBtn]);
}

function createContextBar(bar: Instance): Instance {
    const ctxBar = div({
        classes: [CTX_CLASS],
        context: null,
        meta: null,
        onClick: async (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-unpin]");
            if (btn === null) return;
            e.stopPropagation();
            const remaining = await aiClient.unpinContext([btn.dataset.unpin!]);
            renderContextBar(bar.el, remaining);
        },
    });
    const inputRow = bar.el.querySelector(".ai-bar__input-row");
    if (inputRow) inputRow.before(ctxBar.el);
    else bar.addChild(ctxBar);
    return ctxBar;
}

function renderContextBar(barEl: HTMLElement, pinned: string[]): void {
    const bar = createInstance(barEl);
    const existing = bar.el.querySelector<HTMLElement>(`.${CTX_CLASS}`);
    if (pinned[0] === undefined) {
        if (existing) createInstance(existing).destroy();
        return;
    }
    const ctxBar = existing ? createInstance(existing) : createContextBar(bar);
    ctxBar.setChildren(...pinned.map(buildCtxTag));
}

export { renderContextBar };
