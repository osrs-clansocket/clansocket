import "./styles/index.css";
import "./app/routes.js";
import { assembleShell } from "./app";
import { events, AppEvents } from "./managers/events";
import { router } from "./managers/router";
import { routeDefs } from "./managers/router/registry";
import { authState } from "./managers/auth-state";
import { deepLink } from "./managers/deep-link";
import { mountHeaderNav, type NavPage } from "./managers/header-nav";
import { identityClient } from "./state/identity/identity-client/index.js";
import { mountNotificationsToast } from "./dom/notifications/toast";
import navPagesJson from "./config/nav-pages.json";
import { createInstance } from "./dom/factory";
import { handleAnchorClick } from "./bootstrap/anchor-scroll.js";
import { attachAuditInstrumentation } from "./bootstrap/audit-instrumentation.js";
import { installErrorBoundary } from "./bootstrap/error-boundary.js";
import { wireLoginButton, wireLogoutButton } from "./bootstrap/header-auth.js";
import { cleanupServiceWorker, schedulePreload } from "./bootstrap/preload.js";

const SCROLL_TOP_THRESHOLD = 10;

async function initApp(): Promise<void> {
    installErrorBoundary();
    const host = document.getElementById("app");
    if (host === null) return;
    const { shell, routeRoot } = assembleShell();
    createInstance(host).addChild(shell);
    const session = await identityClient.session().catch(() => null);
    const isAuthed = session !== null;
    authState.set(isAuthed);
    for (const def of routeDefs()) router.register(def);
    router.mount(routeRoot);
    deepLink.start();
    if (isAuthed) mountNotificationsToast(shell);
    const headerEl = shell.querySelector<HTMLElement>(".dashboard__header");
    if (headerEl) {
        const staticPages = (navPagesJson as { pages: NavPage[] }).pages;
        const baseVisible = isAuthed ? staticPages : staticPages.filter((p) => p.key !== "account");
        mountHeaderNav({ headerEl, staticPages: baseVisible, isAuthed });
        if (isAuthed) schedulePreload();
        wireLogoutButton(headerEl, isAuthed);
        wireLoginButton(headerEl, isAuthed);
    }
    document.addEventListener("click", handleAnchorClick);
    if (isAuthed) attachAuditInstrumentation();
    window.addEventListener(
        "scroll",
        () => {
            if (window.scrollY < SCROLL_TOP_THRESHOLD) events.emit(AppEvents.SCROLL_TOP);
        },
        { passive: true },
    );
}

document.addEventListener("DOMContentLoaded", () => {
    void initApp();
});
cleanupServiceWorker();
