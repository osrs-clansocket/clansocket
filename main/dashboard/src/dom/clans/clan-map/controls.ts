import { div } from "../../factory/layout-ops";
import { button, span } from "../../factory/content-ops";
import { icon } from "../../factory/content-ops/graphics/media.js";
import { effect, type Signal } from "../../factory/reactive";
import type { Instance } from "../../factory/core";
import type { MapRegion } from "../../../state/clans/stores/map-regions-store.js";
import type { PositionsState, PositionsPlane } from "../../../state/clans/stores/positions-store.js";
import { REGION_TILE_SPAN } from "../../../shared/constants/clan-map-constants.js";

export type ViewMode = "auto" | "manual";

export interface ControlsProps {
    mode$: Signal<ViewMode>;
    activePlane$: Signal<number>;
    gridVisible$: Signal<boolean>;
    namesVisible$: Signal<boolean>;
    lastKnownVisible$: Signal<boolean>;
    mergedLayersVisible$: Signal<boolean>;
    hoverRegion$: Signal<MapRegion | null>;
    positions$: { (): PositionsState };
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
}

const PLANE_COUNT = 4;
const PLANES: readonly number[] = Array.from({ length: PLANE_COUNT }, (_, i) => i);

function planeButton(plane: number, activePlane$: Signal<number>): Instance<HTMLButtonElement> {
    const btn = button(
        {
            ariaLabel: `Plane ${plane}`,
            variant: "chip",
            compact: true,
            classes: ["clan-map__plane-btn"],
            onClick: () => activePlane$.set(plane),
            context: `select plane ${plane}`,
            meta: null,
        },
        [span({ context: null, meta: null }, [String(plane)])],
    );
    effect(() => {
        btn.el.classList.toggle("is-active", activePlane$() === plane);
    });
    return btn;
}

function layersButton(mergedLayersVisible$: Signal<boolean>): Instance<HTMLButtonElement> {
    const iconInst = icon({ name: "layers", ariaHidden: true, context: null, meta: null });
    const btn = button(
        {
            ariaLabel: "Toggle layered planes",
            variant: "chip",
            compact: true,
            classes: ["clan-map__layers-btn"],
            onClick: () => mergedLayersVisible$.set(!mergedLayersVisible$()),
            context: "toggle layered planes (ghost-floor underlay)",
            meta: null,
        },
        [iconInst],
    );
    effect(() => {
        btn.el.classList.toggle("is-active", mergedLayersVisible$());
    });
    return btn;
}

function modeButton(mode$: Signal<ViewMode>): Instance<HTMLButtonElement> {
    const labelSpan = span({ context: null, meta: null }, ["follow"]);
    const btn = button(
        {
            ariaLabel: "Toggle follow mode",
            variant: "chip",
            compact: true,
            classes: ["clan-map__mode-btn"],
            onClick: () => mode$.set(mode$() === "auto" ? "manual" : "auto"),
            context: "toggle follow blips",
            meta: null,
        },
        [labelSpan],
    );
    effect(() => {
        const isAuto = mode$() === "auto";
        btn.el.classList.toggle("is-active", isAuto);
        labelSpan.el.textContent = isAuto ? "follow" : "manual";
    });
    return btn;
}

function gridButton(gridVisible$: Signal<boolean>): Instance<HTMLButtonElement> {
    const btn = button(
        {
            variant: "chip",
            compact: true,
            classes: ["clan-map__grid-btn"],
            onClick: () => gridVisible$.set(!gridVisible$()),
            context: "toggle grid overlay",
            meta: null,
        },
        [span({ context: null, meta: null }, ["grid"])],
    );
    effect(() => {
        btn.el.classList.toggle("is-active", gridVisible$());
    });
    return btn;
}

function namesButton(namesVisible$: Signal<boolean>): Instance<HTMLButtonElement> {
    const btn = button(
        {
            variant: "chip",
            compact: true,
            classes: ["clan-map__names-btn"],
            onClick: () => namesVisible$.set(!namesVisible$()),
            context: "toggle name cards overlay",
            meta: null,
        },
        [span({ context: null, meta: null }, ["names"])],
    );
    effect(() => {
        btn.el.classList.toggle("is-active", namesVisible$());
    });
    return btn;
}

function lastKnownButton(lastKnownVisible$: Signal<boolean>): Instance<HTMLButtonElement> {
    const btn = button(
        {
            variant: "chip",
            compact: true,
            classes: ["clan-map__last-known-btn"],
            onClick: () => lastKnownVisible$.set(!lastKnownVisible$()),
            context: "toggle last-known blips for disconnected clannies",
            meta: null,
        },
        [span({ context: null, meta: null }, ["last known"])],
    );
    effect(() => {
        btn.el.classList.toggle("is-active", lastKnownVisible$());
    });
    return btn;
}

function zoomButton(label: string, onClick: () => void, context: string): Instance<HTMLButtonElement> {
    return button(
        {
            ariaLabel: label,
            variant: "chip",
            compact: true,
            classes: ["clan-map__zoom-btn"],
            onClick,
            context,
            meta: null,
        },
        [span({ context: null, meta: null }, [label])],
    );
}

function resetButton(onClick: () => void): Instance<HTMLButtonElement> {
    return button(
        {
            variant: "chip",
            compact: true,
            classes: ["clan-map__reset-btn"],
            onClick,
            context: "reset viewport",
            meta: null,
        },
        [span({ context: null, meta: null }, ["fit"])],
    );
}

function planeLabel(activePlane$: Signal<number>, positions$: ControlsProps["positions$"]): Instance<HTMLElement> {
    const labelSpan = span({ classes: ["clan-map__plane-count"], context: null, meta: null }, [""]);
    effect(() => {
        const plane = activePlane$();
        const state = positions$();
        const count = countOnPlane(state, plane);
        const planeInfo = state.planes.find((p: PositionsPlane) => p.plane === plane);
        const regionCount = planeInfo?.region_count ?? 0;
        labelSpan.el.textContent = `${count} blip${count === 1 ? "" : "s"} · ${regionCount} regions`;
    });
    return labelSpan;
}

function countOnPlane(state: PositionsState, plane: number): number {
    let count = 0;
    for (const row of state.byHash.values()) {
        if (row.location_plane === plane) count++;
    }
    return count;
}

function hoverReadout(hoverRegion$: Signal<MapRegion | null>): Instance<HTMLElement> {
    const labelSpan = span({ classes: ["clan-map__hover-readout"], context: null, meta: null }, [""]);
    effect(() => {
        const r = hoverRegion$();
        if (r === null) {
            labelSpan.el.textContent = "";
            labelSpan.el.classList.remove("is-visible");
            return;
        }
        labelSpan.el.textContent = `region ${r.region_id} · world X ${r.base_x}-${r.base_x + REGION_TILE_SPAN} · Y ${r.base_y}-${r.base_y + REGION_TILE_SPAN}`;
        labelSpan.el.classList.add("is-visible");
    });
    return labelSpan;
}

export function clanMapControls(props: ControlsProps): Instance<HTMLElement> {
    const planeChips = div(
        { classes: ["clan-map__chip-row"], context: "plane selector", meta: null },
        PLANES.map((p) => planeButton(p, props.activePlane$)),
    );
    const zoomChips = div({ classes: ["clan-map__chip-row"], context: "zoom controls", meta: null }, [
        zoomButton("−", props.onZoomOut, "zoom out"),
        zoomButton("+", props.onZoomIn, "zoom in"),
        resetButton(props.onResetView),
    ]);
    const modeChips = div({ classes: ["clan-map__chip-row"], context: "view modes", meta: null }, [
        layersButton(props.mergedLayersVisible$),
        modeButton(props.mode$),
        gridButton(props.gridVisible$),
        namesButton(props.namesVisible$),
        lastKnownButton(props.lastKnownVisible$),
    ]);
    const topRow = div({ classes: ["clan-map__controls-row"], context: null, meta: null }, [
        planeChips,
        modeChips,
        zoomChips,
        planeLabel(props.activePlane$, props.positions$),
    ]);
    return div({ classes: ["clan-map__controls"], context: "clan map controls", meta: null }, [
        topRow,
        hoverReadout(props.hoverRegion$),
    ]);
}
