import { createInstance, div, onceEffect } from "../../factory";
import { renderMarkdown } from "../../../ai/markdown";
import {
    AI_BAR_MSG_AI_CLASS,
    AI_BAR_MSG_CLASS,
    AI_BAR_MSG_CONTENT_CLASS,
    AI_BAR_MSG_WELCOME_CLASS,
} from "../../../shared/constants/ai-bar-constants.js";

const WELCOME_STORAGE_KEY = "varez_onboarded";
const WELCOME_VERSION = "1";

const WELCOME_CONTENT = `
**Meet Varez.**

Not a chatbot — a collaborative clan assistant that shapes itself to you over time.

- **I learn from how you correct me.** Tell me when I miss, confirm when I nail it — that's what sharpens me.
- **Set hard rules.** Say "always X" or "never Y" and I'll treat them as permanent.
- **Challenge me when something feels off.** I try to ground answers in the dashboard and data, but I can still slip. Your pushback keeps me grounded.
- **Profile lives on this browser.** Clear site data and I start fresh.

Give me a few turns to calibrate.
`.trim();

function hasSeenWelcome(): boolean {
    try {
        return localStorage.getItem(WELCOME_STORAGE_KEY) === WELCOME_VERSION;
    } catch {
        return true;
    }
}

function markWelcomeSeen(): void {
    try {
        localStorage.setItem(WELCOME_STORAGE_KEY, WELCOME_VERSION);
    } catch {
        return;
    }
}

function renderWelcome(containerEl: HTMLElement): void {
    const content = div({ classes: [AI_BAR_MSG_CONTENT_CLASS], context: null, meta: null }).setHTML(
        renderMarkdown(WELCOME_CONTENT),
    );
    const msg = div(
        {
            classes: [AI_BAR_MSG_CLASS, AI_BAR_MSG_AI_CLASS, AI_BAR_MSG_WELCOME_CLASS],
            effects: onceEffect("rise"),
            context: null,
            meta: null,
        },
        [content],
    );
    createInstance(containerEl).addChild(msg);
}

export { hasSeenWelcome, markWelcomeSeen, renderWelcome };
