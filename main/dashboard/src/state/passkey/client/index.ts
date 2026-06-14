import {
    attachPasskeyToCurrentAccount,
    createLinkCode,
    generateBackupCodes,
    getBackupCodeMeta,
    listDevices,
    revokeDevice,
} from "./device-mgmt.js";
import { recoverWithBackupCode, redeemLinkCode, signinWithDevice, signupWithDevice } from "./register-flow.js";

export {
    LINK_CODE_DIGITS,
    PASSKEY_ERR,
    isPasskeyError,
    type PasskeyDevice,
    type PasskeyError,
    type SignupResult,
} from "./types.js";

export const passkeyClient = {
    signupWithDevice,
    redeemLinkCode,
    recoverWithBackupCode,
    signinWithDevice,
    createLinkCode,
    generateBackupCodes,
    getBackupCodeMeta,
    listDevices,
    revokeDevice,
    attachPasskeyToCurrentAccount,
};
