import { recordClanAudit, type RecordClanAuditEntry } from "../../database/clans/audit/clan-audit-helpers/record.js";
import type { Actor } from "../shared/vault-types.js";

interface ActorIdentity {
    actor: string | null;
    actorKind: "user" | "system";
    component: string | null;
}

function actorIdentity(actor: Actor): ActorIdentity {
    if (actor.kind === "user") return { actor: actor.user_id, actorKind: "user", component: null };
    return { actor: null, actorKind: "system", component: actor.component };
}

export function assertActor(actor: Actor): void {
    if (actor.kind === "user" && (typeof actor.user_id !== "string" || actor.user_id.length === 0)) {
        throw new Error("vault actor.user_id required for kind 'user'");
    }
    if (actor.kind === "system" && (typeof actor.component !== "string" || actor.component.length === 0)) {
        throw new Error("vault actor.component required for kind 'system'");
    }
}

export function actorAttribution(actor: Actor): string | null {
    return actorIdentity(actor).actor;
}

export function recordVaultAudit(
    clanId: string,
    action: string,
    entry_key: string,
    actor: Actor,
    extra: Record<string, unknown> = {},
): void {
    const id = actorIdentity(actor);
    const payload: Record<string, unknown> = { entry_key, ...extra };
    if (id.component !== null) payload.component = id.component;
    const entry = {
        actor: id.actor,
        actorKind: id.actorKind,
        action,
        targetId: entry_key,
        payload,
    } as unknown as RecordClanAuditEntry;
    recordClanAudit(clanId, entry);
}
