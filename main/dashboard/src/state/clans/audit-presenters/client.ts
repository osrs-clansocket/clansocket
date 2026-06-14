import type { ClanAuditEntry } from "../clans-client/index.js";
import { pload, shortId, type PresentedEntry, type Presenter } from "./types.js";

export const CLIENT_PRESENTERS: Record<string, Presenter> = {
    "client:click": (entry) => {
        const label = pload(entry, "label");
        return {
            title: "Clicked",
            detail: label ?? entry.targetId ?? "",
            icon: "bi-cursor-fill",
            semantic: "chain",
            hasExpansion: false,
        };
    },
    "client:submit": (entry) => {
        const fields = entry.payload?.fields;
        const rsn = pload(entry, "rsn");
        const label = pload(entry, "label");
        const fieldList = Array.isArray(fields) ? fields.filter((f) => typeof f === "string").join(", ") : "";
        const parts: string[] = [];
        if (label) parts.push(label);
        else if (entry.targetId) parts.push(entry.targetId);
        if (fieldList.length > 0) parts.push(`fields: ${fieldList}`);
        if (rsn) parts.push(`RSN: ${rsn}`);
        return {
            title: "Submitted",
            detail: parts.join(" · "),
            icon: "bi-send-fill",
            semantic: "chain",
            hasExpansion: false,
        };
    },
    "client:route": (entry) => ({
        title: "Navigated",
        detail: entry.targetId ?? "",
        icon: "bi-arrow-right-circle",
        semantic: "chain",
        hasExpansion: false,
    }),
};

export function defaultPresenter(entry: ClanAuditEntry): PresentedEntry {
    return {
        title: entry.action,
        detail: shortId(entry.targetId),
        icon: "bi-circle",
        semantic: "system",
        hasExpansion: false,
    };
}
