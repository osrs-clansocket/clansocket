import { pload, shortId, type Presenter } from "./types.js";

export const MANAGER_PRESENTERS: Record<string, Presenter> = {
    "server:manager.granted": (entry) => {
        const role = pload(entry, "role") ?? "manager";
        const via = pload(entry, "grantedVia");
        const priorRole = pload(entry, "priorRole");
        const target = shortId(entry.targetId);
        const detail = via ? `${target} as ${role}, via ${via}` : `${target} as ${role}`;
        return {
            title: "Manager granted",
            detail,
            icon: "bi-person-plus-fill",
            semantic: "write",
            hasExpansion: priorRole !== null,
        };
    },
    "server:manager.revoked": (entry) => ({
        title: "Manager revoked",
        detail: shortId(entry.targetId),
        icon: "bi-person-dash-fill",
        semantic: "destructive",
        hasExpansion: false,
    }),
    "server:manager.request.created": (entry) => {
        const rsn = pload(entry, "declaredRsn");
        const source = pload(entry, "source");
        return {
            title: "Manager request",
            detail: source ? `RSN: ${rsn ?? "?"} · via ${source}` : `RSN: ${rsn ?? "?"}`,
            icon: "bi-envelope-plus",
            semantic: "write",
            hasExpansion: false,
        };
    },
    "server:manager.request.approved": (entry) => {
        const rsn = pload(entry, "declaredRsn");
        return {
            title: "Manager request approved",
            detail: rsn ? `RSN: ${rsn}` : "",
            icon: "bi-envelope-check",
            semantic: "write",
            hasExpansion: false,
        };
    },
    "server:manager.request.denied": (entry) => {
        const rsn = pload(entry, "declaredRsn");
        return {
            title: "Manager request denied",
            detail: rsn ? `RSN: ${rsn}` : "",
            icon: "bi-envelope-x",
            semantic: "destructive",
            hasExpansion: false,
        };
    },
};
