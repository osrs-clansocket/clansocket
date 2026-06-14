export const ICON_BAKE_SIZE = 256;

export interface CustomizeTransform {
    scale: number;
    rotate: number;
    translateX: number;
    translateY: number;
}

export function parseTransform(body: unknown): CustomizeTransform | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const scale = typeof b.scale === "number" && Number.isFinite(b.scale) ? b.scale : null;
    const rotate = typeof b.rotate === "number" && Number.isFinite(b.rotate) ? b.rotate : null;
    const translateX = typeof b.translateX === "number" && Number.isFinite(b.translateX) ? b.translateX : null;
    const translateY = typeof b.translateY === "number" && Number.isFinite(b.translateY) ? b.translateY : null;
    if (scale === null || rotate === null || translateX === null || translateY === null) return null;
    if (scale < 0.1 || scale > 5) return null;
    if (rotate < -360 || rotate > 360) return null;
    const maxOffset = ICON_BAKE_SIZE * 2;
    if (Math.abs(translateX) > maxOffset || Math.abs(translateY) > maxOffset) return null;
    return { scale, rotate, translateX, translateY };
}
