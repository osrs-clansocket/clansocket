import "../../../styles/pages/account/index.css";
import "../../../styles/pages/clans/manage/clan-tabs-page.css";
import "../../../styles/pages/clans/manage/clan-tab-page.css";
import {
    button,
    derived,
    div,
    effect,
    header,
    heading,
    onceEffect,
    paragraph,
    section,
    span,
    type Instance,
} from "../../factory";
import { identityStore } from "../../../state/identity/stores/identity-store.js";
import { profileStore } from "../../../state/identity/stores/profile-store.js";
import { type LiveSession } from "../../../state/identity/profile/profile-client.js";
import { clansStore } from "../../../state/clans/stores/clans-store.js";
import { memberClansStore } from "../../../state/clans/stores/member-clans-store.js";
import { buildClanSocketAccountSection } from "../../auth/account/index";
import { buildAiSettingsCard } from "../../pages/account/ai-settings/index.js";
import { buildClanList } from "./clan/clan-row";
import { buildSessionRow } from "./shared/session-row";
import { buildAddClan } from "./workflows/add-clan";
import { buildRequestManagement } from "./workflows/request-management";
import { openDisplayNameEdit } from "./workflows/display-name-edit";
import {
    ACCOUNT_CARD_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_GREETING_CLASS,
    ACCOUNT_GREETING_EDIT_CLASS,
    ACCOUNT_GREETING_NAME_CLASS,
    ACCOUNT_GREETING_NAME_ROW_CLASS,
    ACCOUNT_GREETING_PREFIX_CLASS,
    ACCOUNT_IDENTITY_BAR_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
    ACCOUNT_SECTION_TITLE_CLASS,
} from "../../../shared/constants/account-constants.js";
import { BS_ICON_CLASS, BS_ICON_PENCIL_CLASS } from "../../../shared/constants/bootstrap-icon-constants.js";
import { ROUTE_ACCOUNT_CLASS, ROUTE_ROOT_CLASS } from "../../../shared/constants/route-constants.js";

const POLL_MS = 10_000;

export async function renderAccount(): Promise<HTMLElement> {
    await identityStore.refresh();
    const session$ = identityStore.session$;
    const accountName = span({
        classes: [ACCOUNT_GREETING_NAME_CLASS],
        context: null,
        meta: null,
        text: derived(() => {
            const s = session$();
            return s?.displayName ?? "you";
        }),
    });
    const editIcon = button(
        {
            compact: true,
            classes: [ACCOUNT_GREETING_EDIT_CLASS],
            ariaLabel: "Edit display name",
            title: "Edit display name",
            context: "edit your display name",
            meta: ["action", "account"],
            onClick: () => openDisplayNameEdit(nameRow.el, accountName.el, editIcon.el),
        },
        [span({ classes: [BS_ICON_CLASS, BS_ICON_PENCIL_CLASS], context: null, meta: null })],
    );
    const nameRow = div({ classes: [ACCOUNT_GREETING_NAME_ROW_CLASS], context: null, meta: null }, [
        accountName,
        editIcon,
    ]);
    const greeting = div({ classes: [ACCOUNT_GREETING_CLASS], context: null, meta: null }, [
        span({ classes: [ACCOUNT_GREETING_PREFIX_CLASS], text: "Signed in as", context: null, meta: null }),
        nameRow,
    ]);

    const accountBar = header({ classes: [ACCOUNT_IDENTITY_BAR_CLASS], context: null, meta: null }, [greeting]);

    const sessionsList = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    const sessionsEmpty = paragraph({
        classes: [ACCOUNT_EMPTY_CLASS],
        text: "No active sessions. Log into OSRS via RuneLite with the ClanSocket plugin enabled.",
        context: null,
        meta: null,
    });

    const sessionsCard = section({ classes: [ACCOUNT_CARD_CLASS], hidden: "", context: null, meta: null }, [
        heading("h2", {
            classes: [ACCOUNT_SECTION_TITLE_CLASS],
            text: "Active plugin sessions",
            context: null,
            meta: null,
        }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: derived(() => `${profileStore.sessions$().length} connected`),
            context: null,
            meta: null,
        }),
        sessionsList,
        sessionsEmpty,
    ]);

    const clansContainer = div({ context: null, meta: null });
    const addClan = buildAddClan(() => void refresh());
    const requestManagement = buildRequestManagement(() => void refresh());

    const clansCard = section({ classes: [ACCOUNT_CARD_CLASS], context: null, meta: null }, [
        heading("h2", { classes: [ACCOUNT_SECTION_TITLE_CLASS], text: "Your clans", context: null, meta: null }),
        clansContainer,
        addClan,
        requestManagement,
    ]);

    const clansocketAccountSection =
        session$() !== null ? buildClanSocketAccountSection() : div({ context: null, meta: null }).el;

    const aiSettingsCard = buildAiSettingsCard();

    const sessionRowPool = new Map<string, Instance>();
    const renderSessions = (sessions: LiveSession[]): void => {
        if (sessions.length === 0) {
            for (const inst of sessionRowPool.values()) inst.destroy();
            sessionRowPool.clear();
            sessionsCard.el.hidden = true;
            sessionsEmpty.el.hidden = false;
            return;
        }
        sessionsCard.el.hidden = false;
        sessionsEmpty.el.hidden = true;
        const live = new Set<string>();
        for (const s of sessions) {
            live.add(s.rsn);
            if (!sessionRowPool.has(s.rsn)) sessionRowPool.set(s.rsn, buildSessionRow(s));
        }
        for (const [key, inst] of sessionRowPool) {
            if (!live.has(key)) {
                inst.destroy();
                sessionRowPool.delete(key);
            }
        }
        let nextEl: ChildNode | null = sessionsList.el.firstChild;
        for (const s of sessions) {
            const inst = sessionRowPool.get(s.rsn);
            if (inst === undefined) continue;
            if (inst.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
            else sessionsList.addBefore(inst, nextEl);
        }
    };

    const refresh = async (): Promise<void> => {
        await profileStore.refresh();
    };

    await refresh();

    const routeInst = div(
        {
            classes: [ROUTE_ROOT_CLASS, ROUTE_ACCOUNT_CLASS],
            effects: onceEffect("route-enter-right"),
            context: null,
            meta: null,
        },
        [accountBar, sessionsCard, clansCard, clansocketAccountSection, aiSettingsCard],
    );
    const routeEl = routeInst.el;

    routeInst.trackDispose(
        effect(() => {
            renderSessions(profileStore.sessions$());
        }),
    );

    routeInst.trackDispose(
        effect(() => {
            const all = [...clansStore.managed$(), ...memberClansStore.member$()];
            const { list, empty } = buildClanList(all);

            clansContainer.setChildren(list, empty);
        }),
    );

    const cleanupTimer = window.setInterval(() => {
        if (routeEl.isConnected) return;
        routeInst.destroy();
        window.clearInterval(cleanupTimer);
    }, POLL_MS);

    return routeEl;
}
