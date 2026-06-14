import { createInstance } from "../../dom/factory";
import { errorBanner } from "../../dom/factory/data-ops/error-banner.js";
import { ERROR_BANNER_ACTION_HOME } from "../../shared/constants/error-banner-constants.js";
import { events } from "../events";
import { ROUTE_ENTER_BACKWARD, ROUTE_ENTER_FORWARD, type Route } from "./types.js";
import { normalizeClanPath } from "./slug-paths.js";
import { ROUTE_ERROR_TITLE_TEXT } from "../../shared/constants/route-constants.js";

export type { Route } from "./types.js";
export { AppRoutes } from "./types.js";
export {
    clanSlugFromManagePath,
    clanSlugFromPath,
    manageTabFromPath,
    matchClanManagePath,
    matchClanPath,
} from "./slug-paths.js";

const NO_ELEMENT: HTMLElement | null = null;
const routes: Route[] = [];
let rootEl: HTMLElement | null = NO_ELEMENT;
let currentPath = "";
let nextDirection: "forward" | "backward" = "forward";

function isMounted(): boolean {
    return rootEl !== NO_ELEMENT;
}

function findRoute(path: string): Route | undefined {
    return (
        routes.find((r) => r.path === path) ??
        routes.find((r) => r.match !== undefined && r.match(path)) ??
        routes.find((r) => r.path === "/")
    );
}

export const router = {
    register(route: Route): void {
        routes.push(route);
    },

    mount(root: HTMLElement): void {
        rootEl = root;
        window.addEventListener("popstate", () => {
            nextDirection = "backward";
            this.resolve(location.pathname);
        });
        document.addEventListener("click", (e) => {
            const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-route]");
            if (anchor) {
                e.preventDefault();
                this.navigate(anchor.getAttribute("href")!);
            }
        });
        this.resolve(location.pathname);
    },

    navigate(path: string, direction: "forward" | "backward" = "forward"): void {
        if (path === currentPath) return;
        nextDirection = direction;
        history.pushState(NO_ELEMENT, "", path);
        this.resolve(path);
    },

    async resolve(path: string): Promise<void> {
        if (!isMounted()) return;
        const canonical = normalizeClanPath(path);
        if (canonical !== path) {
            history.replaceState(NO_ELEMENT, "", canonical);
            path = canonical;
        }
        const route = findRoute(path);
        if (!route) return;
        if (route.guard) {
            const allowed = await route.guard(path);
            if (allowed === false) {
                const reject = typeof route.onReject === "function" ? route.onReject(path) : (route.onReject ?? "/");
                this.navigate(reject);
                return;
            }
        }
        const prevRoute = currentPath === "" ? undefined : findRoute(currentPath);
        currentPath = path;
        events.emit("route:change", path);
        if (prevRoute !== undefined && prevRoute === route && prevRoute.match === undefined) return;
        const root = createInstance(rootEl!);
        const enterClass = nextDirection === "backward" ? ROUTE_ENTER_BACKWARD : ROUTE_ENTER_FORWARD;
        nextDirection = "forward";
        root.clear();
        try {
            const el = await route.render(path);
            el.classList.add(enterClass);
            root.addChild(el);
            const handler = (): void => {
                el.classList.remove(enterClass);
                el.removeEventListener("animationend", handler);
            };
            el.addEventListener("animationend", handler);
        } catch (err) {
            const errorObj = err as Error;
            const banner = errorBanner({
                title: ROUTE_ERROR_TITLE_TEXT,
                message: errorObj.message,
                path,
                stack: errorObj.stack,
                action: ERROR_BANNER_ACTION_HOME,
            });
            root.addChild(banner);
        }
        window.scrollTo(0, 0);
    },

    current(): string {
        return currentPath;
    },
} as const;
