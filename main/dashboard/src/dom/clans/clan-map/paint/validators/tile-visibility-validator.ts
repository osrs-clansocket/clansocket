interface TileVisibleOpts {
    dx: number;
    dy: number;
    dw: number;
    dh: number;
    canvasW: number;
    canvasH: number;
}

export function tileVisible({ dx, dy, dw, dh, canvasW, canvasH }: TileVisibleOpts): boolean {
    return dx + dw > 0 && dx < canvasW && dy + dh > 0 && dy < canvasH;
}
