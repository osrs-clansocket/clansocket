import type { BrandingController } from "../../branding-controller/index.js";
import {
    CANVAS_CENTER,
    CANVAS_MASK_RADIUS,
    CANVAS_PX,
    CHECKER_FALLBACK_A,
    CHECKER_FALLBACK_B,
    CHECKER_TILE_PX,
    DEGREES_TO_RAD,
} from "./constants.js";

export interface PreviewState {
    image: HTMLImageElement | null;
    loaded: boolean;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
}

export function createRenderer(
    ctx: CanvasRenderingContext2D | null,
    canvasEl: HTMLCanvasElement,
    ctrl: BrandingController,
    previewState: PreviewState,
): () => void {
    const paintChecker = (): void => {
        if (!ctx) return;
        const computed = getComputedStyle(canvasEl);
        const colorA = computed.getPropertyValue("--base-graphite-900").trim() || CHECKER_FALLBACK_A;
        const colorB = computed.getPropertyValue("--base-graphite-500").trim() || CHECKER_FALLBACK_B;
        for (let y = 0; y < CANVAS_PX; y += CHECKER_TILE_PX) {
            for (let x = 0; x < CANVAS_PX; x += CHECKER_TILE_PX) {
                const tileX = Math.floor(x / CHECKER_TILE_PX);
                const tileY = Math.floor(y / CHECKER_TILE_PX);
                ctx.fillStyle = (tileX + tileY) % 2 === 0 ? colorA : colorB;
                ctx.fillRect(x, y, CHECKER_TILE_PX, CHECKER_TILE_PX);
            }
        }
    };

    return (): void => {
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
        ctx.save();
        roundedRectPath(ctx, CANVAS_PX, CANVAS_PX, CANVAS_MASK_RADIUS);
        ctx.clip();
        paintChecker();
        const t = ctrl.transform;
        const img = previewState.image;
        if (previewState.loaded && img && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const longer = Math.max(img.naturalWidth, img.naturalHeight);
            const factor = (CANVAS_PX * t.scale) / longer;
            const w = img.naturalWidth * factor;
            const h = img.naturalHeight * factor;
            ctx.translate(CANVAS_CENTER + t.translateX, CANVAS_CENTER + t.translateY);
            ctx.rotate(t.rotate * DEGREES_TO_RAD);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
        ctx.restore();
    };
}
