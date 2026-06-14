export {
    FORM_CLAIM_FORM as FORM_CLASS,
    FORM_ERROR as ERROR_CLASS,
    FORM_FIELD as FIELD_CLASS,
    FORM_FIELD_LABEL as FIELD_LABEL_CLASS,
    FORM_FORM_ROW as FORM_ROW_CLASS,
    FORM_FORM_ROW_FILL as FORM_ROW_FILL_CLASS,
    FORM_HINT as HINT_CLASS,
    FORM_INPUT as INPUT_CLASS,
} from "../../../../forms/form-classes.js";

export {
    ACCOUNT_EMPTY_CLASS as EMPTY_CLASS,
    ACCOUNT_LIST_CLASS as LIST_CLASS,
    ACCOUNT_ROW_PRIMARY_CLASS as ROW_PRIMARY_CLASS,
} from "../../../../../shared/constants/account-constants.js";
export const PASSWORD_TYPE = "password";

export const CUSTOM_PROVIDER = "__custom__";
export const CUSTOM_MODEL = "__custom_model__";
export const EDITOR_FORM_ID = "vault-editor-form";
const SNAP_1K = 1024;
const SNAP_2K = 2048;
const SNAP_4K = 4096;
const SNAP_8K = 8192;
const SNAP_16K = 16384;
const SNAP_32K_TOKEN = 32000;
export const SNAP_POINTS = [SNAP_1K, SNAP_2K, SNAP_4K, SNAP_8K, SNAP_16K, SNAP_32K_TOKEN];
export const SNAP_TOLERANCE = 256;
export const TOKEN_MIN = 1;
export const TOKEN_MAX = SNAP_32K_TOKEN;
export const TOKEN_DEFAULT = SNAP_4K;
export const KEY_PREFIX_LEN = 4;
export const KEY_SUFFIX_LEN = 4;
export const KEY_SHORT_THRESHOLD = 12;

export type UnlockedSub = { mode: "list" } | { mode: "edit"; provider: string } | { mode: "add" };

export interface KeySettingsHandle {
    el: HTMLElement;
    destroy: () => void;
}

export interface KeySettingsOpts {
    onChange?: () => void;
}
