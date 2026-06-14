import type { ClanAuditAction } from "../../database/clans/audit/clan-audit-actions.js";

export type Actor =
    | { kind: "user"; user_id: string }
    | { kind: "system"; component: string };

export type VerifyStatus = "ok" | "auth-failed" | "rate-limited" | "unreachable";

export type PayloadValidator<T> = (p: unknown) => p is T;

export interface VaultAuditActions {
    read: ClanAuditAction;
    write: ClanAuditAction;
    delete: ClanAuditAction;
    verify: ClanAuditAction;
}

export interface EntryMetadata {
    entry_key: string;
    entry_type: string;
    set_at: number;
    last_verified_at: number | null;
    last_verified_status: VerifyStatus | null;
}

export interface RegisteredEntryType<T> {
    entry_key: string;
    entry_type: string;
    schema_version: number;
    validate: PayloadValidator<T>;
    verify: (payload: T) => Promise<VerifyStatus>;
    onDelete: (clanId: string) => Promise<void>;
    auditActions: VaultAuditActions;
}

export type WriteResult = { ok: true } | { ok: false; reason: "schema-violation" | "unknown-entry-type" };

export interface VaultRow {
    entry_key: string;
    entry_type: string;
    schema_version: number;
    iv_b64: string;
    ciphertext_b64: string;
    last_verified_at: number | null;
    last_verified_status: VerifyStatus | null;
    last_used_at: number | null;
    set_by: string;
    set_at: number;
    updated_at: number;
}
