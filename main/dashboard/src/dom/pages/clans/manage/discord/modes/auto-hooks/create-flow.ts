import { div, type Instance } from "../../../../../../factory";
import { buildSlidePanelCreateForm } from "../../../../../../forms/slide-panels/slide-panel-create-form.js";
import { buildGlassSelect } from "../../../../../../forms/glass/inputs/glass-select.js";
import type { SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import { glassInput } from "../../../../../../forms/glass/inputs/glass-input.js";
import { createAutoHook } from "../../../../../../../state/discord/auto-hooks/client.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import { getDefaultTemplate } from "../../../../../../../shared/constants/clan-manage-discord/token-list.js";
import { ADD_BTN_LABEL } from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";

const SUBMIT_LABEL = "Create";

export interface CreateFlowOptions {
    guildId: string;
    triggerOptions: SelectOption[];
    webhookOptions: SelectOption[];
    onCreated: () => void;
}

interface FormState {
    name: string;
    triggerType: string;
    webhookId: string;
}

function defaultState(triggers: SelectOption[], webhooks: SelectOption[]): FormState {
    return {
        name: "",
        triggerType: triggers[0]?.value ?? "",
        webhookId: webhooks[0]?.value ?? "",
    };
}

function buildFields(opts: CreateFlowOptions, state: FormState): readonly Instance[] {
    const nameInp = glassInput({
        placeholder: "Auto-hook name",
        ariaLabel: "Auto-hook name",
        context: "name this auto-hook for your own reference",
        meta: ["input"],
    });
    nameInp.el.addEventListener("input", () => {
        state.name = nameInp.el.value;
    });
    const triggerSelect = buildGlassSelect("create-trigger", opts.triggerOptions, state.triggerType);
    const triggerHidden = triggerSelect.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (triggerHidden) {
        triggerHidden.addEventListener("change", () => {
            state.triggerType = triggerHidden.value;
        });
    }
    const webhookSelect = buildGlassSelect("create-webhook", opts.webhookOptions, state.webhookId);
    const webhookHidden = webhookSelect.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (webhookHidden) {
        webhookHidden.addEventListener("change", () => {
            state.webhookId = webhookHidden.value;
        });
    }
    return [nameInp, triggerSelect, webhookSelect];
}

export function buildAutoHookCreateFlow(opts: CreateFlowOptions): Instance {
    const state = defaultState(opts.triggerOptions, opts.webhookOptions);
    return buildSlidePanelCreateForm({
        triggerLabel: ADD_BTN_LABEL,
        triggerContext: "open the create-auto-hook form",
        submitLabel: SUBMIT_LABEL,
        submitContext: "create the auto-hook",
        buildFields: () => buildFields(opts, state),
        onSubmit: async () => {
            const session = identityStore.session$();
            if (session === null) return "not signed in";
            if (state.name.length === 0) return "name required";
            if (state.triggerType.length === 0) return "trigger required";
            if (state.webhookId.length === 0) return "webhook required";
            const id = await createAutoHook(opts.guildId, {
                userId: session.id,
                userName: session.displayName,
                autoHookName: state.name,
                triggerType: state.triggerType,
                webhookId: state.webhookId,
                contentTemplate: getDefaultTemplate(state.triggerType),
                useEmbed: false,
                embedTemplateJson: null,
                conditionsJson: null,
                enabled: true,
                webhookUsernameOverride: null,
                webhookAvatarUrlOverride: null,
            });
            if (id === null) return "create failed";
            opts.onCreated();
            return undefined;
        },
    });
}

export function buildEmptyCreatePlaceholder(): Instance {
    return div({ classes: [], context: null, meta: null });
}
