import { createInstance } from "../dom/factory";
import { errorBanner } from "../dom/factory/data-ops/error-banner.js";
import { events } from "../managers/events.js";
import {
    ERROR_BANNER_ACTION_RELOAD,
    ERROR_BANNER_GLOBAL_TITLE,
    ERROR_BANNER_HOST_CLASS,
} from "../shared/constants/error-banner-constants.js";

const HOST_SELECTOR = `.${ERROR_BANNER_HOST_CLASS}`;
const ROUTE_CHANGE_EVENT = "route:change";

let installed = false;
const activeBanners = new Map<string, HTMLElement>();

function bannerKey(message: string, stack: string | undefined): string {
    return `${message}::${stack ?? ""}`;
}

function findHost(): HTMLElement | null {
    return document.querySelector(HOST_SELECTOR);
}

function pruneDetachedEntries(): void {
    for (const [key, el] of activeBanners) {
        if (!document.contains(el)) {
            activeBanners.delete(key);
        }
    }
}

function clearAllBanners(): void {
    const host = findHost();
    if (host !== null) createInstance(host).clear();
    activeBanners.clear();
}

function paintGlobalError(message: string, stack: string | undefined): void {
    pruneDetachedEntries();
    const key = bannerKey(message, stack);
    if (activeBanners.has(key)) return;
    const host = findHost();
    if (host === null) return;
    const banner = errorBanner({
        title: ERROR_BANNER_GLOBAL_TITLE,
        message,
        stack,
        action: ERROR_BANNER_ACTION_RELOAD,
    });
    activeBanners.set(key, banner.el);
    createInstance(host).addChild(banner);
}

function extractRejection(reason: unknown): { message: string; stack: string | undefined } {
    if (reason instanceof Error) {
        return { message: reason.message, stack: reason.stack };
    }
    return { message: String(reason), stack: undefined };
}

export function installErrorBoundary(): void {
    if (installed) return;
    installed = true;
    events.on(ROUTE_CHANGE_EVENT, clearAllBanners);
    window.addEventListener("error", (event) => {
        paintGlobalError(event.message, event.error instanceof Error ? event.error.stack : undefined);
    });
    window.addEventListener("unhandledrejection", (event) => {
        const { message, stack } = extractRejection(event.reason);
        paintGlobalError(message, stack);
    });
}
