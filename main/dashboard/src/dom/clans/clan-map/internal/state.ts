import { effect, signal, type Signal } from "../../../factory/reactive";
import { DEFAULT_H, DEFAULT_PLANE, DEFAULT_W } from "../../../../shared/constants/clan-map-constants.js";
import type { AtlasBox } from "../../../../shared/types/clan-map-view-types.js";
import type { MapRegion } from "../../../../state/clans/stores/map-regions-store.js";
import { persistedScope, readStored, writeStored } from "../../../../state/persistence/index.js";
import type { ViewMode } from "../controls.js";

export const MAINLAND_FALLBACK: AtlasBox = { x: 4960, y: 34628, w: 8000, h: 6000 };
const ALERTED_HASHES_KEY = "clan-map.alertedHashes";

export interface CanvasDims {
    w: number;
    h: number;
}

export interface CanvasRefs {
    bg: HTMLCanvasElement;
    overlay: HTMLCanvasElement;
}

export interface MapStateSignals {
    viewport$: Signal<AtlasBox>;
    mode$: Signal<ViewMode>;
    activePlane$: Signal<number>;
    gridVisible$: Signal<boolean>;
    hoverRegion$: Signal<MapRegion | null>;
    canvasDims$: Signal<CanvasDims>;
    followedHash$: Signal<string | null>;
    alertedHashes$: Signal<ReadonlySet<string>>;
    paintTick$: Signal<number>;
    namesVisible$: Signal<boolean>;
    lastKnownVisible$: Signal<boolean>;
    hoveredBlipHash$: Signal<string | null>;
    mergedLayersVisible$: Signal<boolean>;
}

export function makeStateSignals(): MapStateSignals {
    const settings = persistedScope("clan-map");
    const initialAlerted = readStored<string[]>(ALERTED_HASHES_KEY) ?? [];
    const alertedHashes$ = signal<ReadonlySet<string>>(new Set<string>(initialAlerted));
    effect(() => writeStored(ALERTED_HASHES_KEY, Array.from(alertedHashes$())));
    return {
        viewport$: settings.json<AtlasBox>("viewport", MAINLAND_FALLBACK),
        mode$: settings.json<ViewMode>("mode", "auto"),
        activePlane$: settings.number("activePlane", DEFAULT_PLANE),
        gridVisible$: settings.boolean("gridVisible", false),
        hoverRegion$: signal<MapRegion | null>(null),
        canvasDims$: signal<CanvasDims>({ w: DEFAULT_W, h: DEFAULT_H }),
        followedHash$: settings.json<string | null>("followedHash", null),
        alertedHashes$,
        paintTick$: signal<number>(0),
        namesVisible$: settings.boolean("namesVisible", true),
        lastKnownVisible$: settings.boolean("lastKnownVisible", false),
        hoveredBlipHash$: signal<string | null>(null),
        mergedLayersVisible$: settings.boolean("mergedLayersVisible", true),
    };
}
