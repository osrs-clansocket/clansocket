import { identityClient } from "../state/identity/identity-client/index.js";
import { PASSKEY_ERR, isPasskeyError, passkeyClient } from "../state/passkey/client";
import { promptPasskeySignup } from "../dom/forms/glass/modals/glass-signup.js";

const DEVICE_HAS_PASSKEY_KEY = "clansocket:device-has-passkey";

async function runSignupFlow(): Promise<boolean> {
    const prompt = await promptPasskeySignup();
    if (prompt === null) return false;
    if (prompt.kind === "signin") {
        const result = await passkeyClient.signinWithDevice();
        if (isPasskeyError(result)) return false;
        localStorage.setItem(DEVICE_HAS_PASSKEY_KEY, "1");
        window.location.assign("/account");
        return true;
    }
    const signup = await passkeyClient.signupWithDevice(prompt.displayName, prompt.deviceName);
    if (isPasskeyError(signup)) return false;
    localStorage.setItem(DEVICE_HAS_PASSKEY_KEY, "1");
    sessionStorage.setItem(
        "clansocket:fresh-backup-codes",
        JSON.stringify({ codes: signup.backupCodes ?? [], file: signup.backupCodesFile ?? "" }),
    );
    window.location.assign("/account");
    return true;
}

async function startDeviceLogin(): Promise<void> {
    if (localStorage.getItem(DEVICE_HAS_PASSKEY_KEY) !== "1") {
        await runSignupFlow();
        return;
    }
    const result = await passkeyClient.signinWithDevice();
    if (!isPasskeyError(result)) {
        localStorage.setItem(DEVICE_HAS_PASSKEY_KEY, "1");
        window.location.assign("/account");
        return;
    }
    if (result.error !== PASSKEY_ERR.aborted && result.error !== PASSKEY_ERR.credentialUnknown) return;
    await runSignupFlow();
}

export function wireLogoutButton(headerEl: HTMLElement, isAuthed: boolean): void {
    const btn = headerEl.querySelector<HTMLButtonElement>("[data-logout]");
    if (!btn) return;
    btn.hidden = !isAuthed;
    btn.addEventListener("click", () => {
        void identityClient.logout().then(() => {
            window.location.assign("/");
        });
    });
}

export function wireLoginButton(headerEl: HTMLElement, isAuthed: boolean): void {
    const btn = headerEl.querySelector<HTMLButtonElement>("[data-login]");
    const popover = headerEl.querySelector<HTMLElement>("[data-login-popover]");
    if (!btn || !popover) return;
    btn.hidden = isAuthed;
    if (isAuthed) return;
    const close = (): void => {
        popover.hidden = true;
    };
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        popover.hidden = !popover.hidden;
    });
    popover.querySelectorAll<HTMLButtonElement>("[data-login-provider]").forEach((opt) => {
        opt.addEventListener("click", () => {
            const provider = opt.dataset.loginProvider;
            if (provider === "github") identityClient.startGithubLogin();
            else if (provider === "discord") identityClient.startDiscordLogin();
            else if (provider === "device") void startDeviceLogin();
        });
    });
    document.addEventListener("click", (e) => {
        if (popover.hidden) return;
        const target = e.target as Node;
        if (popover.contains(target) || btn.contains(target)) return;
        close();
    });
}
