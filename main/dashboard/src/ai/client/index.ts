import { fetchPinnedContext, unpinContextIds } from "./pinned-context.js";
import { sendChat } from "./send-chat.js";

export { SEND_KIND_ACTION_FEEDBACK, SEND_KIND_USER } from "./types.js";
export type {
    AiMessage,
    ChatResponse,
    EventFn,
    QueuedResponse,
    SendKind,
    SendOptions,
    SendResult,
    StatusFn,
} from "./types.js";

export const aiClient = {
    send: sendChat,
    getPinnedContext: fetchPinnedContext,
    unpinContext: unpinContextIds,
} as const;
