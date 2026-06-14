import { mountShell, initBgfx, initAi } from "./shell";
import { MS_PER_SECOND } from "../state/time-units";

type IdleCb = (cb: () => void) => void;
const runOnIdle: IdleCb =
    typeof window.requestIdleCallback === "function"
        ? (cb) => window.requestIdleCallback(cb, { timeout: MS_PER_SECOND })
        : (cb) => setTimeout(cb, 1);

interface ShellAssembly {
    shell: HTMLElement;
    routeRoot: HTMLElement;
}

function assembleShell(): ShellAssembly {
    const { shell, routeRoot } = mountShell();
    runOnIdle(() => initBgfx());
    runOnIdle(() => initAi(shell));
    return { shell, routeRoot };
}

export { assembleShell };
export type { ShellAssembly };
