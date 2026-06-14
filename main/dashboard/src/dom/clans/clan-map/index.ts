import { div } from "../../factory/layout-ops";
import { scratchCanvas } from "../../factory/content-ops";
import { effect, type ReadSignal } from "../../factory/reactive";
import type { PositionsState } from "../../../state/clans/stores/positions-store.js";
import { mapRegionsStore } from "../../../state/clans/stores/map-regions-store.js";
import { DEFAULT_H, DEFAULT_W, REGION_PX_DEFAULT } from "../../../shared/constants/clan-map-constants.js";
import type { AtlasBox } from "../../../shared/types/clan-map-view-types.js";
import { setTileRoot } from "./paint/formatters/tile-url-formatter.js";
import { loadManifest } from "./paint/validators/tile-existence-validator.js";
import { viewportAroundBlip } from "./paint/calculators/viewport-calculator.js";
import { makeBlipPositionAnimator, type BlipPositionAnimator } from "./paint/animators/blip-position-animator.js";
import { clanMapControls } from "./controls.js";
import { clanMapMinimap } from "./minimap.js";
import { clanMapNames } from "./names.js";
import { makeStateSignals, type CanvasDims, type MapStateSignals } from "./internal/state.js";
import { makeCanvasSizer } from "./internal/canvas-sizer.js";
import { clampToAtlas, currentMaxDim, currentMinRegions, regionPxOf } from "./internal/helpers.js";
import { resetView, toggleAlert, toggleFollow, zoomByFactor } from "./internal/actions.js";
import {
    bindAlertAnimation,
    bindAutoViewport,
    bindCanvasAspect,
    bindFollow,
    bindHover,
    bindPaint,
    bindPan,
    bindPrefetch,
    bindRegionPxCache,
    bindZoom,
} from "./internal/bindings/index.js";

export interface ClanMapProps {
    positions$: ReadSignal<PositionsState>;
}

const ZOOM_STEP = 0.75;

type TileCache = Map<string, HTMLImageElement>;

interface MountedRefs {
    bg: ReturnType<typeof scratchCanvas>;
    overlay: ReturnType<typeof scratchCanvas>;
}

function buildCanvases(): MountedRefs {
    const bg = scratchCanvas({
        width: DEFAULT_W,
        height: DEFAULT_H,
        classes: ["clan-map__bg"],
        context: null,
        meta: null,
    });
    const overlay = scratchCanvas({
        width: DEFAULT_W,
        height: DEFAULT_H,
        classes: ["clan-map__overlay"],
        context: null,
        meta: null,
    });
    return { bg, overlay };
}

function setupBindings(
    state: MapStateSignals,
    props: ClanMapProps,
    refs: MountedRefs,
    cache: TileCache,
    blipAnimator: BlipPositionAnimator,
): void {
    bindRegionPxCache(props.positions$);
    bindAutoViewport(props.positions$, state);
    bindCanvasAspect(state);
    bindPaint({
        positions$: props.positions$,
        regions$: mapRegionsStore.regions$,
        state,
        refs: { bg: refs.bg.el, overlay: refs.overlay.el },
        cache,
        blipAnimator,
    });
    bindPrefetch(state, cache);
    bindPan(refs.overlay.el, state);
    bindZoom(refs.overlay.el, state, props.positions$);
    bindHover(refs.overlay.el, mapRegionsStore.regions$, props.positions$, state);
    bindFollow(props.positions$, state, blipAnimator);
    bindAlertAnimation(state);
}

function buildSubviews(
    state: MapStateSignals,
    props: ClanMapProps,
    blipAnimator: BlipPositionAnimator,
): {
    controls: ReturnType<typeof clanMapControls>;
    minimap: ReturnType<typeof clanMapMinimap>;
    names: ReturnType<typeof clanMapNames>;
} {
    const controls = clanMapControls({
        mode$: state.mode$,
        activePlane$: state.activePlane$,
        gridVisible$: state.gridVisible$,
        namesVisible$: state.namesVisible$,
        lastKnownVisible$: state.lastKnownVisible$,
        mergedLayersVisible$: state.mergedLayersVisible$,
        hoverRegion$: state.hoverRegion$,
        positions$: props.positions$,
        onZoomIn: () => zoomByFactor(state, props.positions$, ZOOM_STEP),
        onZoomOut: () => zoomByFactor(state, props.positions$, 1 / ZOOM_STEP),
        onResetView: () => resetView(state),
    });
    const minimap = clanMapMinimap({
        positions$: props.positions$,
        viewport$: state.viewport$,
        activePlane$: state.activePlane$,
        mode$: state.mode$,
        alertedHashes$: state.alertedHashes$,
        paintTick$: state.paintTick$,
        followedHash$: state.followedHash$,
    });
    const names = clanMapNames({
        positions$: props.positions$,
        viewport$: state.viewport$,
        canvasDims$: state.canvasDims$,
        activePlane$: state.activePlane$,
        visible$: state.namesVisible$,
        lastKnownVisible$: state.lastKnownVisible$,
        hoveredBlipHash$: state.hoveredBlipHash$,
        paintTick$: state.paintTick$,
        blipAnimator,
    });
    return { controls, minimap, names };
}

function attachDebugHook(state: MapStateSignals): void {
    const dbg = window as unknown as { __clanMap?: unknown };
    dbg.__clanMap = {
        getViewport: (): AtlasBox => state.viewport$(),
        getCanvasDims: (): CanvasDims => state.canvasDims$(),
        getScale: (): number => {
            const v = state.viewport$();
            const d = state.canvasDims$();
            return Math.min(d.w / v.w, d.h / v.h);
        },
        getRenderPxPerRegion: (): number => {
            const v = state.viewport$();
            const d = state.canvasDims$();
            return REGION_PX_DEFAULT * Math.min(d.w / v.w, d.h / v.h);
        },
    };
}

function focusOn(state: MapStateSignals, props: ClanMapProps, hash: string): void {
    const ps = props.positions$();
    const row = ps.byHash.get(hash);
    if (row === undefined || ps.mapMeta === null) return;
    state.activePlane$.set(row.location_plane);
    const dims = state.canvasDims$();
    const canvasAspect = dims.h > 0 ? dims.w / dims.h : 1;
    state.viewport$.set(
        clampToAtlas(
            viewportAroundBlip(row, ps.mapMeta, regionPxOf(ps), currentMinRegions(), canvasAspect, currentMaxDim()),
        ),
    );
    state.mode$.set("manual");
}

export interface ClanMapApi {
    host: ReturnType<typeof div>;
    focusOnHash: (hash: string) => void;
    toggleFollow: (hash: string) => void;
    toggleAlert: (hash: string) => void;
    followedHash$: ReadSignal<string | null>;
    alertedHashes$: ReadSignal<ReadonlySet<string>>;
}

export function clanMap(props: ClanMapProps): ClanMapApi {
    void loadManifest();
    const refs = buildCanvases();
    const state = makeStateSignals();
    const cache: TileCache = new Map<string, HTMLImageElement>();
    const blipAnimator = makeBlipPositionAnimator();
    setupBindings(state, props, refs, cache, blipAnimator);
    effect(() => {
        setTileRoot(state.mergedLayersVisible$() ? "tiles-merged" : "tiles");
    });
    const { controls, minimap, names } = buildSubviews(state, props, blipAnimator);
    const host = div({ classes: ["clan-map"], context: "clan positions map", meta: ["data"] }, [
        refs.bg,
        refs.overlay,
        names,
        controls,
        minimap,
    ]);
    attachDebugHook(state);
    const sync = makeCanvasSizer(host.el, { bg: refs.bg.el, overlay: refs.overlay.el }, state.canvasDims$);
    const observer = new ResizeObserver(sync);
    queueMicrotask(() => {
        observer.observe(host.el);
        sync();
    });
    return {
        host,
        focusOnHash: (hash: string) => focusOn(state, props, hash),
        toggleFollow: (hash: string) => toggleFollow(state, hash),
        toggleAlert: (hash: string) => toggleAlert(state, hash),
        followedHash$: state.followedHash$,
        alertedHashes$: state.alertedHashes$,
    };
}
