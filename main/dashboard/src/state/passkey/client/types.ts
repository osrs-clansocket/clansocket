export const LINK_CODE_DIGITS = 6;

export const PASSKEY_ERR = {
    aborted: "webauthn_aborted",
    credentialUnknown: "credential_unknown",
    stepUpRequired: "step_up_required",
    requestFailed: "request_failed",
} as const;

export interface PasskeyError {
    error: string;
    message?: string;
}

export function isPasskeyError(r: unknown): r is PasskeyError {
    return typeof r === "object" && r !== null && "error" in (r as Record<string, unknown>);
}

export interface PasskeyDevice {
    id: string;
    deviceName: string | null;
    createdAt: number;
    lastUsedAt: number | null;
}

export interface SignupResult {
    siteAccountId: string;
    backupCodes: string[] | null;
    backupCodesFile: string | null;
}
