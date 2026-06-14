import type { MapRegion } from "../../state/clans/stores/map-regions-store.js";
import type { BlipPx } from "./clan-map-blip-types.js";
import type { AtlasBox, CompositeView } from "./clan-map-view-types.js";

export interface PaintTilesOpts {
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    view: CompositeView;
    viewport: AtlasBox;
    plane: number;
    cache: Map<string, HTMLImageElement>;
    onTileReady: () => void;
}

export interface PaintGridOpts {
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    view: CompositeView;
    regions: readonly MapRegion[];
}

export interface PaintBlipsOpts {
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    blips: readonly BlipPx[];
    alertedHashes: ReadonlySet<string>;
    showLastKnown: boolean;
}

export interface DrawPulseOpts {
    ctx: CanvasRenderingContext2D;
    px: number;
    py: number;
    nowMs: number;
    baseRadius?: number;
    maxRingRadius?: number;
}
