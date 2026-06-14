import { button, createInstance, type Instance } from "../../../factory";
import { identityClient } from "../../../../state/identity/identity-client/index.js";
import { PASSKEY_ERR, isPasskeyError, passkeyClient } from "../../../../state/passkey/client";
import { promptPasskeySignup } from "../../../forms/glass/modals/glass-signup.js";
import { AUTH_QUIPS } from "../quips/auth-quip.js";
import { mountQuipCard, type QuipCardHandle } from "../quips/core/quip-card.js";

const CARD_CLASS = "ai-bar__auth-card";
const BTN_CLASS = "ai-bar__auth-btn";
const PASSKEY_KEY = "clansocket:device-has-passkey";
const FRESH_BACKUP_CODES_KEY = "clansocket:fresh-backup-codes";
const ACCOUNT_PATH = "/account";
const PASSKEY_FLAG_ON = "1";

interface CardHandlers {
    onGithub: () => void;
    onDiscord: () => void;
    onDevice: () => void | Promise<void>;
}

function buildAuthBtn(
    variant: "github" | "discord" | "device",
    label: string,
    onClick: () => void | Promise<void>,
): Instance<HTMLButtonElement> {
    return button({
        classes: [BTN_CLASS, `${BTN_CLASS}--${variant}`],
        text: label,
        context: `sign in with ${variant}`,
        meta: ["action", "account"],
        onClick,
    });
}

async function tryExistingPasskey(): Promise<"navigated" | "fallthrough" | "abort"> {
    const result = await passkeyClient.signinWithDevice();
    if (!isPasskeyError(result)) {
        window.location.assign(ACCOUNT_PATH);
        return "navigated";
    }
    if (result.error === PASSKEY_ERR.aborted || result.error === PASSKEY_ERR.credentialUnknown) {
        return "fallthrough";
    }
    return "abort";
}

async function runSignupFlow(): Promise<void> {
    const prompt = await promptPasskeySignup();
    if (prompt === null) return;
    if (prompt.kind === "signin") {
        const result = await passkeyClient.signinWithDevice();
        if (isPasskeyError(result)) return;
        localStorage.setItem(PASSKEY_KEY, PASSKEY_FLAG_ON);
        window.location.assign(ACCOUNT_PATH);
        return;
    }
    const signup = await passkeyClient.signupWithDevice(prompt.displayName, prompt.deviceName);
    if (isPasskeyError(signup)) return;
    localStorage.setItem(PASSKEY_KEY, PASSKEY_FLAG_ON);
    sessionStorage.setItem(
        FRESH_BACKUP_CODES_KEY,
        JSON.stringify({ codes: signup.backupCodes ?? [], file: signup.backupCodesFile ?? "" }),
    );
    window.location.assign(ACCOUNT_PATH);
}

async function handleDeviceFlow(): Promise<void> {
    const hasPasskey = localStorage.getItem(PASSKEY_KEY) === PASSKEY_FLAG_ON;
    if (hasPasskey) {
        const outcome = await tryExistingPasskey();
        if (outcome !== "fallthrough") return;
    }
    await runSignupFlow();
}

function buildCardHandlers(teardown: () => void): CardHandlers {
    return {
        onGithub: () => {
            teardown();
            identityClient.startGithubLogin();
        },
        onDiscord: () => {
            teardown();
            identityClient.startDiscordLogin();
        },
        onDevice: async () => {
            await handleDeviceFlow();
        },
    };
}

function showAuthGate(containerEl: HTMLElement, _onAuthenticated: () => void): void {
    hideAuthGate(containerEl);
    const teardownRef: { current: (() => void) | null } = { current: null };
    const teardown = (): void => teardownRef.current?.();
    const handlers = buildCardHandlers(teardown);
    const actions: Instance[] = [
        buildAuthBtn("github", "Sign in with GitHub", handlers.onGithub),
        buildAuthBtn("discord", "Sign in with Discord", handlers.onDiscord),
        buildAuthBtn("device", "Sign in with Device", handlers.onDevice),
    ];
    const handle: QuipCardHandle = mountQuipCard({ quipSet: AUTH_QUIPS, actions });
    teardownRef.current = handle.teardown;
    createInstance(containerEl).addChild(handle.card);
}

function hideAuthGate(containerEl: HTMLElement): void {
    const existing = containerEl.querySelector<HTMLElement>(`.${CARD_CLASS}`);
    if (existing) createInstance(existing).destroy();
}

export { showAuthGate, hideAuthGate };
