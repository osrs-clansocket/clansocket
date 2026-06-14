import type { PaintBlipsOpts } from "../../../../../shared/types/clan-map-paint-types.js";
import type { BlipPx } from "../../../../../shared/types/clan-map-blip-types.js";
import {
    BLIP_FILL,
    BLIP_RADIUS,
    BLIP_STROKE,
    BLIP_STROKE_W,
    ENGAGED_RING_LINE_W,
    ENGAGED_RING_RADIUS_OFFSET,
    ENGAGED_RING_STROKE,
    HEX_VERTICES,
    LAST_KNOWN_ALPHA,
    TWO_PI,
} from "../../../../../shared/constants/clan-map-constants.js";
import { drawPulse } from "./pulse-painter.js";

const HEX_ANGLE_STEP = TWO_PI / HEX_VERTICES;

function traceBlipShape(ctx: CanvasRenderingContext2D, blip: BlipPx): void {
    ctx.beginPath();
    if (blip.isActive) {
        ctx.arc(blip.px, blip.py, BLIP_RADIUS, 0, TWO_PI);
        return;
    }
    for (let i = 0; i < HEX_VERTICES; i++) {
        const angle = HEX_ANGLE_STEP * i;
        const x = blip.px + BLIP_RADIUS * Math.cos(angle);
        const y = blip.py + BLIP_RADIUS * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

export function paintBlips({ ctx, w, h, blips, alertedHashes, showLastKnown }: PaintBlipsOpts): void {
    ctx.clearRect(0, 0, w, h);
    const visible = showLastKnown ? blips : blips.filter((b) => b.isActive);
    if (alertedHashes.size > 0) {
        const nowMs = performance.now();
        for (const blip of visible) {
            if (!alertedHashes.has(blip.accountHash)) continue;
            ctx.globalAlpha = blip.isActive ? 1 : LAST_KNOWN_ALPHA;
            drawPulse({ ctx, px: blip.px, py: blip.py, nowMs });
        }
    }
    for (const blip of visible) {
        if (!blip.engaged) continue;
        ctx.globalAlpha = blip.isActive ? 1 : LAST_KNOWN_ALPHA;
        ctx.strokeStyle = ENGAGED_RING_STROKE;
        ctx.lineWidth = ENGAGED_RING_LINE_W;
        ctx.beginPath();
        ctx.arc(blip.px, blip.py, BLIP_RADIUS + ENGAGED_RING_RADIUS_OFFSET, 0, TWO_PI);
        ctx.stroke();
    }
    ctx.fillStyle = BLIP_FILL;
    ctx.strokeStyle = BLIP_STROKE;
    ctx.lineWidth = BLIP_STROKE_W;
    for (const blip of visible) {
        ctx.globalAlpha = blip.isActive ? 1 : LAST_KNOWN_ALPHA;
        traceBlipShape(ctx, blip);
        ctx.fill();
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}
