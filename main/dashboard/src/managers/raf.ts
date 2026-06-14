const MAX_FRAME_DT_MS = 100;

type Tick = (timeMs: number, deltaMs: number) => void;

const subs = new Set<Tick>();
let rafId = 0;
let prevT = -1;
let paused = false;

function step(t: number): void {
    rafId = 0;
    const dt = prevT >= 0 ? Math.min(t - prevT, MAX_FRAME_DT_MS) : 0;
    prevT = t;
    for (const fn of subs) fn(t, dt);
    if (subs.size > 0 && !paused) rafId = requestAnimationFrame(step);
}

function ensureRunning(): void {
    if (paused || rafId !== 0 || subs.size === 0) return;
    rafId = requestAnimationFrame(step);
}

function halt(): void {
    if (rafId === 0) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
    prevT = -1;
}

function subscribe(fn: Tick): () => void {
    subs.add(fn);
    ensureRunning();
    return (): void => {
        subs.delete(fn);
        if (subs.size === 0) halt();
    };
}

function setPaused(next: boolean): void {
    if (paused === next) return;
    paused = next;
    if (paused) halt();
    else ensureRunning();
}

document.addEventListener("visibilitychange", () => setPaused(document.hidden));

const rafScheduler = { subscribe, setPaused };

export function isHidden(): boolean {
    return document.hidden;
}

export { rafScheduler };
