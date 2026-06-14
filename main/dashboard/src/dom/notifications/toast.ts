import { button, div, effect, heading, onceEffect, paragraph, type Instance } from "../factory";
import { notificationsClient, type AppNotification } from "../../state/notifications/notifications-client.js";
import { notificationsStore } from "../../state/notifications/stores/notifications-store.js";
import {
    TOAST_BODY_CLASS,
    TOAST_BODY_STATIC_CLASS,
    TOAST_CLASS,
    TOAST_CLOSE_CLASS,
    TOAST_STACK_CLASS,
    TOAST_TEXT_CLASS,
    TOAST_TITLE_CLASS,
} from "../../shared/constants/toast-constants.js";

let stack: Instance | null = null;
let stackEffect: { dispose: () => void } | null = null;
const toastPool = new Map<number, Instance>();

function buildToast(n: AppNotification): Instance {
    const title = heading("h4", { classes: [TOAST_TITLE_CLASS], text: n.title, context: null, meta: null });
    const body = paragraph({ classes: [TOAST_TEXT_CLASS], text: n.body, context: null, meta: null });

    const node = div({
        classes: [TOAST_CLASS, `${TOAST_CLASS}--${n.kind}`],
        effects: onceEffect("pop"),
        context: null,
        meta: null,
    });

    const dismissAndRemove = async (): Promise<void> => {
        await notificationsClient.dismiss(n.id);
        node.destroy();
    };

    const close = button({
        classes: [TOAST_CLOSE_CLASS],
        text: "×",
        ariaLabel: "Dismiss",
        context: "dismiss this notification",
        meta: ["action", "notification"],
        onClick: (e) => {
            e.stopPropagation();
            void dismissAndRemove();
        },
    });

    let bodyEl: Instance;
    if (n.href) {
        const link = button(
            {
                classes: [TOAST_BODY_CLASS],
                ariaLabel: n.title,
                context: "open this notification's linked page",
                meta: ["nav", "notification"],
                onClick: async () => {
                    const href = n.href!;
                    await notificationsClient.dismiss(n.id);
                    window.location.assign(href);
                },
            },
            [title, body],
        );
        bodyEl = link;
    } else {
        bodyEl = div({ classes: [TOAST_BODY_CLASS, TOAST_BODY_STATIC_CLASS], context: null, meta: null }, [
            title,
            body,
        ]);
    }

    return node.setChildren(bodyEl, close);
}

export function mountNotificationsToast(parent: HTMLElement): void {
    if (stack) return;
    const stackInst = div({ classes: [TOAST_STACK_CLASS], context: null, meta: null }).mount(parent);
    stack = stackInst;
    stackEffect = effect(() => {
        const list = notificationsStore.list$();
        const liveIds = new Set<number>();
        for (const n of list) {
            liveIds.add(n.id);
            if (!toastPool.has(n.id)) toastPool.set(n.id, buildToast(n));
        }
        for (const [id, inst] of toastPool) {
            if (!liveIds.has(id)) {
                inst.destroy();
                toastPool.delete(id);
            }
        }
        let nextEl: ChildNode | null = stackInst.el.firstChild;
        for (const n of list) {
            const inst = toastPool.get(n.id);
            if (inst === undefined) continue;
            if (inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
            else stackInst.addBefore(inst, nextEl);
        }
    });
}

export function unmountNotificationsToast(): void {
    if (stackEffect !== null) {
        stackEffect.dispose();
        stackEffect = null;
    }
    for (const inst of toastPool.values()) inst.destroy();
    toastPool.clear();
    if (stack) stack.destroy();
    stack = null;
}

export function refreshNotificationsToast(): void {
    void notificationsStore.refresh();
}
