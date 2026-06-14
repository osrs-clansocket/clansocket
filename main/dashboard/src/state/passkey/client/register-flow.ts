import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { deriveDeviceName } from "../derive-device-name";
import { postJSON } from "./http.js";
import { PASSKEY_ERR, isPasskeyError, type PasskeyError, type SignupResult } from "./types.js";

interface RegisterOptionsRequest {
    mode: "new" | "link" | "recover";
    displayName?: string;
    linkCode?: string;
    backupCode?: string;
}

async function doRegisterFlow(
    req: RegisterOptionsRequest,
    deviceName: string | null,
): Promise<SignupResult | PasskeyError> {
    const options = await postJSON<PublicKeyCredentialCreationOptionsJSON>(
        "/api/auth/site/passkey/register/options",
        req,
    );
    if (isPasskeyError(options)) return options;
    let attResponse: RegistrationResponseJSON;
    try {
        attResponse = await startRegistration({ optionsJSON: options });
    } catch (err) {
        return { error: PASSKEY_ERR.aborted, message: (err as Error).message };
    }
    const verify = await postJSON<SignupResult>("/api/auth/site/passkey/register/verify", {
        response: attResponse,
        deviceName: deviceName ?? deriveDeviceName(),
    });
    return verify;
}

export async function signupWithDevice(
    displayName: string,
    deviceName: string | null,
): Promise<SignupResult | PasskeyError> {
    return doRegisterFlow({ mode: "new", displayName }, deviceName);
}

export async function redeemLinkCode(
    linkCode: string,
    deviceName: string | null,
): Promise<SignupResult | PasskeyError> {
    return doRegisterFlow({ mode: "link", linkCode }, deviceName);
}

export async function recoverWithBackupCode(
    backupCode: string,
    deviceName: string | null,
): Promise<SignupResult | PasskeyError> {
    return doRegisterFlow({ mode: "recover", backupCode }, deviceName);
}

export async function signinWithDevice(): Promise<{ siteAccountId: string } | PasskeyError> {
    const options = await postJSON<PublicKeyCredentialRequestOptionsJSON>(
        "/api/auth/site/passkey/authenticate/options",
        {},
    );
    if (isPasskeyError(options)) return options;
    let assertion: AuthenticationResponseJSON;
    try {
        assertion = await startAuthentication({ optionsJSON: options });
    } catch (err) {
        return { error: PASSKEY_ERR.aborted, message: (err as Error).message };
    }
    return postJSON<{ siteAccountId: string }>("/api/auth/site/passkey/authenticate/verify", {
        response: assertion,
    });
}
