import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import { deriveDeviceName } from "../derive-device-name";
import { deleteRequest, getJSON, postJSON } from "./http.js";
import { withStepUp } from "./step-up.js";
import { PASSKEY_ERR, isPasskeyError, type PasskeyDevice, type PasskeyError } from "./types.js";

export async function createLinkCode(): Promise<{ code: string } | PasskeyError> {
    return withStepUp(() => postJSON("/api/auth/site/passkey/device-link/create", {}));
}

export async function generateBackupCodes(): Promise<{ codes: string[]; fileContent: string } | PasskeyError> {
    return withStepUp(() => postJSON("/api/auth/site/passkey/backup-codes/generate", {}));
}

export async function getBackupCodeMeta(): Promise<
    { meta: { generatedAt: number; totalCount: number; remainingCount: number } | null } | PasskeyError
> {
    return getJSON("/api/auth/site/passkey/backup-codes/meta");
}

export async function listDevices(): Promise<{ devices: PasskeyDevice[] } | PasskeyError> {
    return getJSON("/api/auth/site/passkey/devices");
}

export async function revokeDevice(id: string): Promise<{ ok: true } | PasskeyError> {
    return withStepUp(() => deleteRequest(`/api/auth/site/passkey/devices/${encodeURIComponent(id)}`));
}

async function runAttachPasskeyOnce(deviceName: string | null): Promise<{ ok: true } | PasskeyError> {
    const options = await postJSON<PublicKeyCredentialCreationOptionsJSON>("/api/auth/site/passkey/attach/options", {});
    if (isPasskeyError(options)) return options;
    let attResponse: RegistrationResponseJSON;
    try {
        attResponse = await startRegistration({ optionsJSON: options });
    } catch (err) {
        return { error: PASSKEY_ERR.aborted, message: (err as Error).message };
    }
    return postJSON("/api/auth/site/passkey/attach/verify", {
        response: attResponse,
        deviceName: deviceName ?? deriveDeviceName(),
    });
}

export async function attachPasskeyToCurrentAccount(deviceName: string | null): Promise<{ ok: true } | PasskeyError> {
    return withStepUp(() => runAttachPasskeyOnce(deviceName));
}
