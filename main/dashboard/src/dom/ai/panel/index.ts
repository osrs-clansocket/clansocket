import { aiClient } from "../../../ai/client";
import { identityClient } from "../../../state/identity/identity-client/index.js";
import { events, AppEvents } from "../../../managers/events";
import { createInstance } from "../../factory";
import { wireSend, displayHistory } from "../send";
import { hasSeenWelcome, markWelcomeSeen, renderWelcome } from "../onboarding/welcome";
import { addMessage } from "./messages";
import { renderContextBar } from "./context";
import { initResize } from "./layout/resize.js";
import { renderRecent } from "./history-renderer";
import { wireCloneEvents } from "./clone-events";
import { createExpandHandler, restoreExpandedState } from "./layout/bar-height.js";
import { showAuthGate } from "./auth/gate";
import { showVaultGate, hideVaultGate, type VaultState } from "./vault/gate";
import { vaultExists, listProviders as listVaultProviders } from "../../../ai/vault/vault";
import { isUnlocked, restoreSession } from "../../../ai/vault/session";

const EXPANDED_CLASS = "ai-bar--expanded";
const HIDDEN_CLASS = "ai-bar--hidden";
const PANEL_HIDDEN_CLASS = "ai-bar--panel-hidden";

interface BarRefs {
    bar: HTMLElement;
    messages: HTMLElement;
    history: HTMLElement;
    expandBtn: HTMLButtonElement;
    input: HTMLInputElement;
    statusEl: HTMLElement;
    sendBtn: HTMLButtonElement;
    inputRow: HTMLElement;
    resizeHandle: HTMLElement;
}

function queryRefs(bar: HTMLElement): BarRefs {
    return {
        bar,
        messages: bar.querySelector<HTMLElement>("[data-ai-messages]")!,
        history: bar.querySelector<HTMLElement>(".ai-bar__history")!,
        expandBtn: bar.querySelector<HTMLButtonElement>(".ai-bar__expand")!,
        input: bar.querySelector<HTMLInputElement>("[data-ai-input]")!,
        statusEl: bar.querySelector<HTMLElement>("[data-ai-status]")!,
        sendBtn: bar.querySelector<HTMLButtonElement>("[data-ai-send]")!,
        inputRow: bar.querySelector<HTMLElement>(".ai-bar__input-row")!,
        resizeHandle: bar.querySelector<HTMLElement>("[data-ai-resize]")!,
    };
}

function mountAiPanel(el: HTMLElement): { show: () => void; hide: () => void } {
    const r = queryRefs(el);
    restoreExpandedState(r.bar);
    r.expandBtn.addEventListener("click", createExpandHandler(r.bar));
    initResize(r.bar, r.resizeHandle, r.history);
    wireCloneEvents(r.history);
    wireSend({
        input: r.input,
        sendBtn: r.sendBtn,
        statusEl: r.statusEl,
        messagesEl: r.messages,
        addMsg: addMessage,
        onResponse: (res) => renderContextBar(r.bar, res.pinnedContext ?? []),
    });
    let lastState: PanelState | null = null;
    events.on(AppEvents.AI_VAULT_CHANGED, () => {
        if (r.bar.classList.contains(HIDDEN_CLASS)) return;
        void (async () => {
            const state = await detectPanelState();
            if (state === lastState) return;
            lastState = state;
            if (state === "ready") {
                hideVaultGate(r.messages);
                createInstance(r.messages).clear();
                await presentReady(r);
            } else if (state !== "auth-needed") {
                r.inputRow.classList.add(PANEL_HIDDEN_CLASS);
                r.history.classList.add(PANEL_HIDDEN_CLASS);
                createInstance(r.messages).clear();
                showVaultGate(r.messages, state);
            }
        })();
    });
    return {
        show: async () => {
            await restoreSession();
            lastState = await showPanel(r);
        },
        hide: () => hidePanel(r.bar),
    };
}

async function presentReady(r: BarRefs): Promise<void> {
    r.inputRow.classList.remove(PANEL_HIDDEN_CLASS);
    r.history.classList.remove(PANEL_HIDDEN_CLASS);
    renderRecent(r.messages, displayHistory);
    if (!displayHistory.length) {
        if (hasSeenWelcome()) {
            addMessage({ containerEl: r.messages, text: "AI ready", type: "status" });
        } else {
            renderWelcome(r.messages);
            markWelcomeSeen();
        }
    }
    const pinned = await aiClient.getPinnedContext();
    renderContextBar(r.bar, pinned);
}

type PanelState = "auth-needed" | "ready" | VaultState;

async function detectPanelState(): Promise<PanelState> {
    const session = await identityClient.session().catch(() => null);
    if (session === null) return "auth-needed";
    if (!(await vaultExists())) return "no-vault";
    if (!isUnlocked()) return "locked";
    const list = await listVaultProviders();
    return list.length > 0 ? "ready" : "no-key";
}

async function showPanel(r: BarRefs): Promise<PanelState> {
    r.bar.classList.remove(HIDDEN_CLASS);
    const state = await detectPanelState();
    if (state === "auth-needed") {
        showAuthGate(r.messages, () => {
            void showPanel(r);
        });
    } else if (state === "ready") {
        hideVaultGate(r.messages);
        await presentReady(r);
    } else {
        r.inputRow.classList.add(PANEL_HIDDEN_CLASS);
        r.history.classList.add(PANEL_HIDDEN_CLASS);
        createInstance(r.messages).clear();
        showVaultGate(r.messages, state);
    }
    return state;
}

function hidePanel(bar: HTMLElement): void {
    bar.classList.add(HIDDEN_CLASS);
    bar.classList.remove(EXPANDED_CLASS);
}

export { mountAiPanel, addMessage };
