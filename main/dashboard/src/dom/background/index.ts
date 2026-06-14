import { mount, unmount, isMounted } from "./mount";

function defaultEnabled(): boolean {
    try {
        if (matchMedia("(pointer: coarse)").matches) return false;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    } catch {
        return true;
    }
    return true;
}

function initBackground(): void {
    if (defaultEnabled()) mount();
}

export { initBackground, mount, unmount, isMounted };
