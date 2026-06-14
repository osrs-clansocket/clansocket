import { signal, type ReadSignal } from "../../dom/factory/reactive";
import { MS_PER_SECOND } from "../time-units";

const _now = signal(Date.now());
let timer = 0;

function ensureStarted(): void {
    if (timer) return;
    timer = window.setInterval(() => _now.set(Date.now()), MS_PER_SECOND);
}

function teardown(): void {
    if (timer) window.clearInterval(timer);
    timer = 0;
}

export const timeStore = {
    get now$(): ReadSignal<number> {
        ensureStarted();
        return _now;
    },
    teardown,
};
