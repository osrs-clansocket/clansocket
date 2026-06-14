import { createInstance, scratchCanvas, type Instance } from "../factory";
import { rafScheduler } from "../../managers/raf";
import { createParticle, drawFrame, type Particle } from "./particles-sim";
import {
    BG_FX_CANVAS_CLASS,
    BG_FX_CANVAS_PARTICLES_CLASS,
    BG_FX_WRAP_CLASS,
} from "../../shared/constants/bg-fx-constants.js";

const PARTICLE_COUNT = 28;
const DPR_CAP = 2;

type Size = { w: number; h: number };

function sizeCanvas(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, size: Size): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    size.w = w;
    size.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createCanvas(): Instance<HTMLCanvasElement> {
    return scratchCanvas({
        width: window.innerWidth,
        height: window.innerHeight,
        classes: [BG_FX_WRAP_CLASS, BG_FX_CANVAS_CLASS, BG_FX_CANVAS_PARTICLES_CLASS],
        context: null,
        meta: null,
    }).setAttr("aria-hidden", "true");
}

function startRunner(ctx: CanvasRenderingContext2D, size: Size, parts: Particle[]): () => void {
    let simTime = 0;
    return rafScheduler.subscribe((_t, dt) => {
        simTime += dt;
        drawFrame({ ctx, w: size.w, h: size.h, t: simTime }, parts);
    });
}

function mountParticles(): () => void {
    const canvas = createCanvas();
    createInstance(document.body).addFirst(canvas);
    const ctx = canvas.el.getContext("2d");
    if (!ctx) {
        canvas.destroy();
        return (): void => undefined;
    }
    const size: Size = { w: window.innerWidth, h: window.innerHeight };
    sizeCanvas(canvas.el, ctx, size);
    const parts = Array.from({ length: PARTICLE_COUNT }, () => createParticle(size.w, size.h));
    const stopRunner = startRunner(ctx, size, parts);
    const resize = (): void => sizeCanvas(canvas.el, ctx, size);
    window.addEventListener("resize", resize);
    return (): void => {
        window.removeEventListener("resize", resize);
        stopRunner();
        canvas.destroy();
    };
}

export { mountParticles };
