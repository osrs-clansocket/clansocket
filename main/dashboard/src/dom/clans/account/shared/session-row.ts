import "../../../../styles/pages/account/row-page.css";
import "../../../../styles/pages/account/session-page.css";
import { div, rsnTag, span, type Instance } from "../../../factory";
import type { LiveSession, PluginLoginState } from "../../../../state/identity/profile/profile-client.js";
import { fmtUptime, pingClass } from "./format";
import { META_CLASS, PRIMARY_CLASS, ROW_CLASS } from "./row-classes";
import {
    ACCOUNT_SESSION_ROW_PRIMARY_CLASS,
    ACCOUNT_SESSION_RSN_CLASS,
    ACCOUNT_SESSION_WORLD_CLASS,
    ACCOUNT_SESSION_WORLD_OFFLINE_CLASS,
} from "../../../../shared/constants/account-constants.js";

const LOGIN_STATE_LABELS: Record<PluginLoginState, string> = {
    LOGGED_IN: "",
    LOGGED_OUT: "Logged out",
    LOGIN_SCREEN: "Logged out",
    LOGIN_SCREEN_AUTHENTICATOR: "Auth screen",
    LOGGING_IN: "Logging in",
    LOADING: "Loading",
    HOPPING: "Hopping",
    CONNECTION_LOST: "Conn lost",
    STARTING: "Starting",
    UNKNOWN: "Unknown",
};

export function buildRow(primary: string, meta: string): Instance {
    return div({ classes: [ROW_CLASS], context: null, meta: null }, [
        span({ classes: [PRIMARY_CLASS], text: primary, context: null, meta: null }),
        span({ classes: [META_CLASS], text: meta, context: null, meta: null }),
    ]);
}

function buildPingSpan(pingMs: number | null | undefined): Instance {
    const text = typeof pingMs === "number" && Number.isFinite(pingMs) ? `${pingMs} ms` : "— ms";
    return span({ classes: pingClass(pingMs).split(" "), text, context: null, meta: null });
}

function buildWorldPill(s: LiveSession): Instance | null {
    if (s.loginState === "LOGGED_IN" && typeof s.world === "number" && s.world > 0) {
        return span({ classes: [ACCOUNT_SESSION_WORLD_CLASS], text: `W${s.world}`, context: null, meta: null });
    }
    const label = LOGIN_STATE_LABELS[s.loginState] ?? "Unknown";
    if (label.length === 0) return null;
    return span({
        classes: [ACCOUNT_SESSION_WORLD_CLASS, ACCOUNT_SESSION_WORLD_OFFLINE_CLASS],
        text: label,
        context: null,
        meta: null,
    });
}

export function buildSessionRow(s: LiveSession): Instance {
    const inGameClanName = s.inGameClanName ?? "";
    const managerClanName = s.managerClanName ?? "";
    const rank = s.inGameClanRank ?? null;
    let inGameLabel: string;
    if (inGameClanName.length === 0) {
        inGameLabel = "not in any clan";
    } else if (s.inGameClanStatus === "active") {
        inGameLabel = `${inGameClanName} (${rank ?? "unknown"})`;
    } else {
        inGameLabel = `${inGameClanName} (${rank ?? "unknown"}) — not on clansocket`;
    }
    const managerLabel = s.managerVerified && managerClanName.length > 0 ? ` • managing ${managerClanName}` : "";
    const primaryChildren: Instance[] = [];
    const pill = buildWorldPill(s);
    if (pill) primaryChildren.push(pill);
    primaryChildren.push(rsnTag({ rsn: s.rsn, rank, context: null, meta: null }));
    primaryChildren.push(
        span({
            classes: [ACCOUNT_SESSION_RSN_CLASS],
            text: ` — ${inGameLabel}${managerLabel}`,
            context: null,
            meta: null,
        }),
    );
    return div({ classes: [ROW_CLASS], context: null, meta: null }, [
        div(
            { classes: [PRIMARY_CLASS, ACCOUNT_SESSION_ROW_PRIMARY_CLASS], context: null, meta: null },
            primaryChildren,
        ),
        span({ classes: [META_CLASS], text: `Connected ${fmtUptime(s.connectedAt)}`, context: null, meta: null }),
        buildPingSpan(s.pingMs),
    ]);
}
