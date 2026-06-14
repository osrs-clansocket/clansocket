const FX_PREFIX = "fx-";

export type EffectTrigger = "mount" | "intersect";

export interface EffectDescriptor {
    name: string;
    trigger?: EffectTrigger;
    delay?: number;
    once?: boolean;
}

export type EffectProp = string | EffectDescriptor;

function toDescriptor(prop: EffectProp): EffectDescriptor {
    if (typeof prop === "string") return { name: prop };
    return prop;
}

function effectClass(name: string): string {
    return name.startsWith(FX_PREFIX) ? name : `${FX_PREFIX}${name}`;
}

function attachOnce(el: HTMLElement, cls: string): void {
    const handler = (): void => {
        el.classList.remove(cls);
        el.removeEventListener("animationend", handler);
    };
    el.addEventListener("animationend", handler);
}

function applyOne(el: HTMLElement, d: EffectDescriptor): void {
    const cls = effectClass(d.name);
    const trigger = d.trigger ?? "mount";
    const fire = (): void => {
        el.classList.add(cls);
        if (d.once === true) attachOnce(el, cls);
    };
    if (trigger === "intersect") {
        const observer = new IntersectionObserver((entries, obs) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                if (d.delay !== undefined && d.delay > 0) window.setTimeout(fire, d.delay);
                else fire();
                obs.disconnect();
            }
        });
        observer.observe(el);
        return;
    }
    if (d.delay !== undefined && d.delay > 0) {
        window.setTimeout(fire, d.delay);
        return;
    }
    fire();
}

export function applyEffects(el: HTMLElement, prop: EffectProp | readonly EffectProp[] | undefined): void {
    if (prop === undefined) return;
    if (Array.isArray(prop)) {
        for (const p of prop) applyOne(el, toDescriptor(p));
        return;
    }
    applyOne(el, toDescriptor(prop as EffectProp));
}

export function addEffectClass(el: HTMLElement, name: string): void {
    el.classList.add(effectClass(name));
}

export function removeEffectClass(el: HTMLElement, name: string): void {
    el.classList.remove(effectClass(name));
}

const DEFAULT_STAGGER_BASE_MS = 60;

export function staggerDelay(index: number, baseMs: number = DEFAULT_STAGGER_BASE_MS): number {
    return Math.max(0, index) * baseMs;
}

export function staggerEffect(index: number, name: string, baseMs: number = DEFAULT_STAGGER_BASE_MS): EffectDescriptor {
    return { name, trigger: "intersect", delay: staggerDelay(index, baseMs), once: true };
}

export function onceEffect(name: string, trigger: EffectTrigger = "mount"): EffectDescriptor {
    return { name, trigger, once: true };
}

export function expandWithFade(el: HTMLElement, open: boolean): void {
    if (open) {
        el.hidden = false;
        applyOne(el, { name: "fade-in", once: true });
        return;
    }
    el.hidden = true;
}

export function flashInvalid(el: HTMLElement): void {
    applyOne(el, { name: "flash-attention", once: true });
}

export function animateKeyframes(
    el: HTMLElement,
    keyframes: readonly Keyframe[],
    options: KeyframeAnimationOptions,
): Animation {
    return el.animate(keyframes as Keyframe[], options);
}
