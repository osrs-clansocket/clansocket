import { tileUrl } from "../formatters/tile-url-formatter.js";
import { tileExists } from "../validators/tile-existence-validator.js";

interface EnsureTileOpts {
    plane: number;
    zoom: number;
    tx: number;
    ty: number;
    cache: Map<string, HTMLImageElement>;
    onReady: () => void;
}

export function ensureTile({ plane, zoom, tx, ty, cache, onReady }: EnsureTileOpts): HTMLImageElement {
    const url = tileUrl(plane, zoom, tx, ty);
    const existing = cache.get(url);
    if (existing) {
        if (!existing.complete) {
            existing.addEventListener(
                "load",
                () => {
                    const p =
                        existing.decode === undefined ? Promise.resolve() : existing.decode().catch(() => undefined);
                    p.then(onReady);
                },
                { once: true },
            );
        }
        return existing;
    }
    if (!tileExists(plane, zoom, tx, ty)) {
        const placeholder = new Image();
        cache.set(url, placeholder);
        return placeholder;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    img.addEventListener("load", () => {
        const p = img.decode === undefined ? Promise.resolve() : img.decode().catch(() => undefined);
        p.then(onReady);
    });
    cache.set(url, img);
    return img;
}

export function prefetchTile(
    plane: number,
    zoom: number,
    tx: number,
    ty: number,
    cache: Map<string, HTMLImageElement>,
): Promise<void> {
    const url = tileUrl(plane, zoom, tx, ty);
    if (cache.has(url)) return Promise.resolve();
    if (!tileExists(plane, zoom, tx, ty)) {
        const placeholder = new Image();
        cache.set(url, placeholder);
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.addEventListener("load", () => {
            if (img.decode !== undefined) void img.decode().catch(() => undefined);
            resolve();
        });
        img.addEventListener("error", () => resolve());
        img.src = url;
        cache.set(url, img);
    });
}
