import type { PaintGridOpts } from "../../../../../shared/types/clan-map-paint-types.js";
import {
    GRID_FONT_MIN_PX,
    GRID_FONT_SCALE_FACTOR,
    GRID_LABEL,
    GRID_LABEL_MIN_PX,
    GRID_LINE_GAP_RATIO,
    GRID_STROKE,
    REGION_PX_DEFAULT,
    REGION_TILE_SPAN,
} from "../../../../../shared/constants/clan-map-constants.js";
import { tileVisible } from "../validators/tile-visibility-validator.js";

export function paintGrid({ ctx, w, h, view, regions }: PaintGridOpts): void {
    ctx.strokeStyle = GRID_STROKE;
    ctx.lineWidth = 1;
    const showLabels = view.scale * REGION_PX_DEFAULT >= GRID_LABEL_MIN_PX;
    let fontPx = 0;
    if (showLabels) {
        fontPx = Math.max(GRID_FONT_MIN_PX, Math.floor(view.scale * GRID_FONT_SCALE_FACTOR));
        ctx.font = `${fontPx}px ui-monospace, monospace`;
        ctx.fillStyle = GRID_LABEL;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
    }
    for (const r of regions) {
        const dx = r.px * view.scale + view.offsetX;
        const dy = r.py * view.scale + view.offsetY;
        const dw = r.pw * view.scale;
        const dh = r.ph * view.scale;
        if (!tileVisible({ dx, dy, dw, dh, canvasW: w, canvasH: h })) continue;
        ctx.strokeRect(dx, dy, dw, dh);
        if (showLabels) {
            const cx = dx + dw / 2;
            const cy = dy + dh / 2;
            const lineGap = fontPx * GRID_LINE_GAP_RATIO;
            ctx.fillText(`${r.base_x}-${r.base_x + REGION_TILE_SPAN}`, cx, cy - lineGap);
            ctx.fillText(`${r.base_y}-${r.base_y + REGION_TILE_SPAN}`, cx, cy + lineGap);
        }
    }
}
