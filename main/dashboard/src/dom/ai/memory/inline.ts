import { button, createInstance, div, effect, type Instance } from "../../factory";
import { memoryClient, type MemoryFile, type MemoryResult } from "../../../ai/memory-client";
import { memoryStore } from "../../../state/stores/memory-store";
import { renderList, renderLoading } from "./list";
import { renderEditor, emptyDraft, MODE_EDIT, MODE_CREATE, type Mode } from "./editor";
import { glassConfirm } from "../../forms/glass/modals/glass-confirm.js";
import {
    AI_MEMORY_CONTENT_CLASS,
    AI_MEMORY_INLINE_BODY_CLASS,
    AI_MEMORY_INLINE_CLASS,
    AI_MEMORY_LIST_CLASS,
    AI_MEMORY_LIST_ITEM_CLASS,
    AI_MEMORY_NEW_CLASS,
    AI_MEMORY_PLACEHOLDER_CLASS,
    AI_MEMORY_SIDEBAR_CLASS,
    AI_MEMORY_STATUS_CLASS,
    AI_MEMORY_STATUS_ERROR_CLASS,
} from "../../../shared/constants/ai-memory-constants.js";

const STATUS_CLEAR_MS = 4000;

interface Handles {
    list: Instance;
    content: Instance;
    status: Instance;
}

function setStatus(h: Handles, text: string, isError = false): void {
    h.status.setText(text);
    h.status.toggleClass(AI_MEMORY_STATUS_ERROR_CLASS, isError);
    if (!text) return;
    setTimeout(() => {
        if (h.status.el.textContent === text) h.status.setText("");
    }, STATUS_CLEAR_MS);
}

function showPlaceholder(h: Handles): void {
    h.content.setChildren(
        div({
            classes: [AI_MEMORY_PLACEHOLDER_CLASS],
            text: "Select a memory file or create a new one.",
            context: null,
            meta: null,
        }),
    );
}

async function runWriteOp(h: Handles, successMsg: string, op: () => Promise<MemoryResult>): Promise<void> {
    try {
        const result = await op();
        if (!result.ok) {
            setStatus(h, result.error ?? "operation failed", true);
            return;
        }
        setStatus(h, successMsg);
        await memoryStore.refresh();
        showPlaceholder(h);
    } catch (err) {
        setStatus(h, (err as Error).message, true);
    }
}

function openEditor(h: Handles, mode: Mode, file: MemoryFile): void {
    renderEditor(h.content.el, mode, file, {
        onCancel: () => showPlaceholder(h),
        onSave: async (draft, m) => {
            const isEdit = m === MODE_EDIT;
            await runWriteOp(h, `${isEdit ? "Updated" : "Created"} ${draft.id}`, () =>
                isEdit ? memoryClient.update(draft.id, draft) : memoryClient.create(draft),
            );
        },
        onDelete: async (id) => {
            const confirmed = await glassConfirm({
                title: "Delete memory",
                message: `Permanently delete "${id}"? This cannot be undone.`,
                confirmLabel: "Delete",
                danger: true,
            });
            if (confirmed) await runWriteOp(h, `Deleted ${id}`, () => memoryClient.remove(id));
        },
    });
}

function buildInline(onNew: () => void, onListClick: (e: MouseEvent) => void): { root: Instance; handles: Handles } {
    const list = div({
        classes: [AI_MEMORY_LIST_CLASS],
        data: { list: "" },
        context: null,
        meta: null,
        onClick: onListClick,
    });
    const newBtn = button({
        classes: [AI_MEMORY_NEW_CLASS],
        text: "+ New memory",
        data: { new: "" },
        context: "create a new memory file",
        meta: ["action"],
        onClick: onNew,
    });
    const content = div({ classes: [AI_MEMORY_CONTENT_CLASS], data: { content: "" }, context: null, meta: null });
    const status = div({ classes: [AI_MEMORY_STATUS_CLASS], data: { status: "" }, context: null, meta: null });
    const sidebar = div({ classes: [AI_MEMORY_SIDEBAR_CLASS], context: null, meta: null }, [newBtn, list]);
    const body = div({ classes: [AI_MEMORY_INLINE_BODY_CLASS], context: null, meta: null }, [sidebar, content]);
    const root = div({ classes: [AI_MEMORY_INLINE_CLASS], context: null, meta: null }, [body, status]);
    return { root, handles: { list, content, status } };
}

function mountInlineMemorySection(hostEl: HTMLElement): void {
    const handlesRef: { current: Handles | null } = { current: null };
    const { root, handles } = buildInline(
        () => openEditor(handlesRef.current!, MODE_CREATE, emptyDraft()),
        async (e) => {
            const item = (e.target as HTMLElement).closest<HTMLElement>(`.${AI_MEMORY_LIST_ITEM_CLASS}`);
            if (!item?.dataset.id) return;
            try {
                const file = await memoryClient.get(item.dataset.id);
                openEditor(handlesRef.current!, MODE_EDIT, file);
            } catch (err) {
                setStatus(handlesRef.current!, (err as Error).message, true);
            }
        },
    );
    handlesRef.current = handles;
    createInstance(hostEl).addChild(root);
    showPlaceholder(handles);
    renderLoading(handles.list.el);
    root.trackDispose(
        effect(() => {
            renderList(handles.list.el, memoryStore.files$());
        }),
    );
    root.trackDispose(
        effect(() => {
            const err = memoryStore.error$();
            if (err !== null) setStatus(handles, err, true);
        }),
    );
}

export { mountInlineMemorySection };
