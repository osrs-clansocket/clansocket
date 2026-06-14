import type { DrawPulseOpts } from "../../../../../shared/types/clan-map-paint-types.js";
import {
    BLIP_RADIUS,
    PULSE_CYCLE_MS,
    PULSE_MAX_ALPHA,
    PULSE_MAX_RADIUS,
    PULSE_RINGS,
    TWO_PI,
} from "../../../../../shared/constants/clan-map-constants.js";

export function drawPulse({
    ctx,
    px,
    py,
    nowMs,
    baseRadius = BLIP_RADIUS,
    maxRingRadius = PULSE_MAX_RADIUS,
}: DrawPulseOpts): void {
    for (let i = 0; i < PULSE_RINGS; i++) {
        const offset = (i * PULSE_CYCLE_MS) / PULSE_RINGS;
        const phase = ((nowMs + offset) % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
        const r = baseRadius + maxRingRadius * phase;
        const alpha = PULSE_MAX_ALPHA * (1 - phase);
        ctx.fillStyle = `rgba(255, 82, 82, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TWO_PI);
        ctx.fill();
    }
}
