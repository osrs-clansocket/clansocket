import type { ClanAuditEntry } from "../clans-client/index.js";
import { CLAIM_PRESENTERS } from "./claim.js";
import { CLIENT_PRESENTERS, defaultPresenter } from "./client.js";
import { MANAGER_PRESENTERS } from "./manager.js";
import { MISC_PRESENTERS } from "./misc.js";
import { withCausedBy, type PresentedEntry, type Presenter } from "./types.js";

export type { PresentedEntry } from "./types.js";

const REGISTRY: Record<string, Presenter> = {
    ...CLAIM_PRESENTERS,
    ...MANAGER_PRESENTERS,
    ...MISC_PRESENTERS,
    ...CLIENT_PRESENTERS,
};

export function present(entry: ClanAuditEntry): PresentedEntry {
    const presenter = REGISTRY[entry.action] ?? defaultPresenter;
    return withCausedBy(entry, presenter(entry));
}
