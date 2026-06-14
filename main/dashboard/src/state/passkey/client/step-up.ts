import { startAuthentication } from "@simplewebauthn/browser";
import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { postJSON } from "./http.js";
import { PASSKEY_ERR, isPasskeyError, type PasskeyError } from "./types.js";

export async function runStepUp(): Promise<PasskeyError | null> {
    const options = await postJSON<PublicKeyCredentialRequestOptionsJSON>("/api/auth/site/passkey/step-up/options", {});
    if (isPasskeyError(options)) return options;
    let assertion: AuthenticationResponseJSON;
    try {
        assertion = await startAuthentication({ optionsJSON: options });
    } catch (err) {
        return { error: PASSKEY_ERR.aborted, message: (err as Error).message };
    }
    const verify = await postJSON("/api/auth/site/passkey/step-up/verify", { response: assertion });
    if (isPasskeyError(verify)) return verify;
    return null;
}

export async function withStepUp<T>(op: () => Promise<T | PasskeyError>): Promise<T | PasskeyError> {
    const first = await op();
    if (!isPasskeyError(first) || first.error !== PASSKEY_ERR.stepUpRequired) return first;
    const stepErr = await runStepUp();
    if (stepErr) return stepErr;
    return op();
}
