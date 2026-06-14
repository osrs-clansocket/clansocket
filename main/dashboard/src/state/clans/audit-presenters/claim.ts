import { pload, shortId, type Presenter } from "./types.js";

export const CLAIM_PRESENTERS: Record<string, Presenter> = {
    "server:claim.completed": (entry) => {
        const name = pload(entry, "displayName");
        const slug = pload(entry, "slug");
        return {
            title: "Clan claimed",
            detail: name && slug ? `${name} (${slug})` : (name ?? slug ?? ""),
            icon: "bi-shield-check",
            semantic: "write",
            hasExpansion: false,
        };
    },
    "server:claim.transferred": (entry) => {
        const newOwner = pload(entry, "newOwnerSiteAccountId");
        return {
            title: "Ownership transferred",
            detail: newOwner ? `to ${shortId(newOwner)}` : "",
            icon: "bi-arrow-left-right",
            semantic: "write",
            hasExpansion: true,
        };
    },
    "server:claim.consent_requested": (entry) => {
        const rsn = pload(entry, "declaredRsn");
        const name = pload(entry, "declaredClanName");
        return {
            title: "Claim consent requested",
            detail: name ? `${rsn ?? "?"} → ${name}` : `RSN: ${rsn ?? "?"}`,
            icon: "bi-envelope-paper",
            semantic: "write",
            hasExpansion: false,
        };
    },
    "server:claim.consent_confirmed": (entry) => {
        const rsn = pload(entry, "declaredRsn");
        return {
            title: "Claim consent confirmed",
            detail: rsn ? `RSN: ${rsn}` : "",
            icon: "bi-shield-check",
            semantic: "write",
            hasExpansion: false,
        };
    },
    "server:claim.consent_rejected": (entry) => {
        const rsn = pload(entry, "declaredRsn");
        return {
            title: "Claim consent rejected",
            detail: rsn ? `RSN: ${rsn}` : "",
            icon: "bi-shield-x",
            semantic: "destructive",
            hasExpansion: false,
        };
    },
};
