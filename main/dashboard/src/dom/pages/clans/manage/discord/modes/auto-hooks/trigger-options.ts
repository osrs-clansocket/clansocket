import type { SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import {
    getTriggerLabel,
    listTriggerTypes,
} from "../../../../../../../shared/constants/clan-manage-discord/token-list.js";

export function buildTriggerOptions(): SelectOption[] {
    return listTriggerTypes().map((t) => ({ value: t, label: getTriggerLabel(t) }));
}
