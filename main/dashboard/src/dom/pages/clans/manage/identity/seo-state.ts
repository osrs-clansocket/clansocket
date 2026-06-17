import { signal } from "../../../../factory";
import {
    diffPatch,
    emptyForm,
    fromSeo,
    patchHasChanges,
    type FormFields,
} from "../../../../../state/clans/discovery/seo-form.js";
import type { ManageClanSeo } from "../../../../../state/clans/clans-client/index.js";

export const STATUS_SAVED = "Saved.";
export const STATUS_FAILED = "Save failed.";
export const STATUS_EMPTY = "";

export interface PanelState {
    form: ReturnType<typeof signal<FormFields>>;
    original: ReturnType<typeof signal<FormFields>>;
    status: ReturnType<typeof signal<string>>;
    saving: ReturnType<typeof signal<boolean>>;
}

export function newPanelState(): PanelState {
    return {
        form: signal<FormFields>(emptyForm()),
        original: signal<FormFields>(emptyForm()),
        status: signal<string>(STATUS_EMPTY),
        saving: signal<boolean>(false),
    };
}

export function updateField(state: PanelState, key: keyof FormFields, value: string | boolean): void {
    state.form.set({ ...state.form(), [key]: value });
}

export function isDirty(state: PanelState): boolean {
    return patchHasChanges(diffPatch(state.form(), state.original()));
}

export function commitLoaded(state: PanelState, seo: ManageClanSeo): void {
    const f = fromSeo(seo);
    state.form.set(f);
    state.original.set(f);
    state.status.set(STATUS_EMPTY);
}
