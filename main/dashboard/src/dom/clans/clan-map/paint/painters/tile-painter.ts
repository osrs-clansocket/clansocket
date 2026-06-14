import type { PaintTilesOpts } from "../../../../../shared/types/clan-map-paint-types.js";
import { BG_FILL } from "../../../../../shared/constants/clan-map-constants.js";
import { pickZoom } from "../pickers/zoom-picker.js";
import { computeTileRange } from "../calculators/tile-range-calculator.js";
import { ensureTile } from "../caches/tile-cache.js";
import { tileVisible } from "../validators/tile-visibility-validator.js";
import { findAncestorDraw, findChildDraws } from "../finders/fallback-tile-finder.js";

const MIN_DRAW_PX = 2;
const MAX_FALLBACK_LEVELS = 4;

export function paintTiles({ ctx, w, h, view, viewport, plane, cache, onTileReady }: PaintTilesOpts): void {
    ctx.fillStyle = BG_FILL;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const zoom = pickZoom(view.scale);
    const range = computeTileRange(viewport, zoom);
    for (let ty = range.tyMin; ty <= range.tyMax; ty++) {
        for (let tx = range.txMin; tx <= range.txMax; tx++) {
            if (tx < 0 || ty < 0) continue;
            const worldX = tx * range.tileWorldSize;
            const worldY = ty * range.tileWorldSize;
            const dx = Math.round(worldX * view.scale + view.offsetX);
            const dy = Math.round(worldY * view.scale + view.offsetY);
            const dxNext = Math.round((worldX + range.tileWorldSize) * view.scale + view.offsetX);
            const dyNext = Math.round((worldY + range.tileWorldSize) * view.scale + view.offsetY);
            const dw = dxNext - dx;
            const dh = dyNext - dy;
            if (dw < MIN_DRAW_PX || dh < MIN_DRAW_PX) continue;
            if (!tileVisible({ dx, dy, dw, dh, canvasW: w, canvasH: h })) continue;
            const img = ensureTile({ plane, zoom, tx, ty, cache, onReady: onTileReady });
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, dx, dy, dw, dh);
                continue;
            }
            const anc = findAncestorDraw(plane, zoom, tx, ty, cache, MAX_FALLBACK_LEVELS);
            if (anc !== null) {
                ctx.drawImage(anc.img, anc.srcX, anc.srcY, anc.srcSize, anc.srcSize, dx, dy, dw, dh);
            }
            const children = findChildDraws(plane, zoom, tx, ty, cache);
            if (children.length === 0) continue;
            const halfWFloor = Math.floor(dw / 2);
            const halfHFloor = Math.floor(dh / 2);
            const halfWCeil = dw - halfWFloor;
            const halfHCeil = dh - halfHFloor;
            for (const child of children) {
                const isRight = (child.quad & 1) !== 0;
                const isBottom = child.quad >> 1 !== 0;
                const qx = isRight ? halfWFloor : 0;
                const qy = isBottom ? halfHFloor : 0;
                const qw = isRight ? halfWCeil : halfWFloor;
                const qh = isBottom ? halfHCeil : halfHFloor;
                ctx.drawImage(child.img, dx + qx, dy + qy, qw, qh);
            }
        }
    }
}
