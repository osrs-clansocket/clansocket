import { div } from "../../factory/layout-ops";
import { scratchCanvas, button } from "../../factory/content-ops";
import { image, icon } from "../../factory/content-ops/graphics/media.js";
import { effect, signal, type Signal, type ReadSignal } from "../../factory/reactive";
import { scheduleOp } from "../../factory/scheduler";
import type { Instance } from "../../factory/core";
import type { PositionsState } from "../../../state/clans/stores/positions-store.js";
import { drawPulse } from "./paint/painters/pulse-painter.js";
import { clampToAtlas, computeNextViewportAtlasAnchor, followedAtlasPoint } from "./internal/helpers.js";
import { makeViewportAnimator } from "./internal/animators/viewport-animator.js";
import { WHEEL_ZOOM_PER_PIXEL } from "../../../shared/constants/clan-map-constants.js";
import type { AtlasBox } from "../../../shared/types/clan-map-view-types.js";

const MINIMAP_W = 80;
const MINIMAP_H = 279;
const ATLAS_W = 13056;
const ATLAS_H = 45568;
const SCALE_X = MINIMAP_W / ATLAS_W;
const SCALE_Y = MINIMAP_H / ATLAS_H;

const VIEWBOX_STROKE = "#c9a84c";
const VIEWBOX_LINE_W = 1.5;
const BLIP_FILL = "#ff5252";
const BLIP_STROKE = "#0b0e13";
const BLIP_RADIUS = 2;
const TWO_PI = Math.PI * 2;

function previewUrl(plane: number): string {
    if (plane === 0) return "/resources/osrs/image_world_map/preview_world.webp";
    return `/resources/osrs/image_world_map/preview_world_z${plane}.webp`;
}

export interface MinimapProps {
    positions$: ReadSignal<PositionsState>;
    viewport$: Signal<AtlasBox>;
    activePlane$: Signal<number>;
    mode$: Signal<"auto" | "manual">;
    alertedHashes$: ReadSignal<ReadonlySet<string>>;
    paintTick$: ReadSignal<number>;
    followedHash$: ReadSignal<string | null>;
}

const PULSE_BASE_RADIUS = 2;
const PULSE_MAX_RING = 5;
const PULSE_CYCLE_MS = 1400;
const ALERT_ALPHA_MIN = 0.15;
const ALERT_ALPHA_MAX = 1.0;

interface PaintMinimapOpts {
    ctx: CanvasRenderingContext2D;
    viewport: AtlasBox;
    positions: PositionsState;
    plane: number;
    alertedHashes: ReadonlySet<string>;
}

function paintMinimap({ ctx, viewport, positions, plane, alertedHashes }: PaintMinimapOpts): void {
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.strokeStyle = VIEWBOX_STROKE;
    ctx.lineWidth = VIEWBOX_LINE_W;
    const bx = viewport.x * SCALE_X;
    const by = viewport.y * SCALE_Y;
    const bw = viewport.w * SCALE_X;
    const bh = viewport.h * SCALE_Y;
    ctx.strokeRect(bx, by, bw, bh);
    const meta = positions.mapMeta;
    if (meta === null) return;
    const nowMs = alertedHashes.size > 0 ? performance.now() : 0;
    for (const row of positions.byHash.values()) {
        if (row.location_plane !== plane) continue;
        const ix = (row.location_x - meta.origin_world_x) * meta.pixels_per_tile;
        const iy = (meta.top_world_y - row.location_y) * meta.pixels_per_tile;
        const px = ix * SCALE_X;
        const py = iy * SCALE_Y;
        if (alertedHashes.has(row.account_hash)) {
            drawPulse({ ctx, px, py, nowMs, baseRadius: PULSE_BASE_RADIUS, maxRingRadius: PULSE_MAX_RING });
        }
    }
    const PULSE_PHASE_BIAS = 0.5;
    const PULSE_PHASE_AMP = 0.5;
    ctx.fillStyle = BLIP_FILL;
    ctx.strokeStyle = BLIP_STROKE;
    ctx.lineWidth = 0.5;
    const phase = (nowMs % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
    const alertAlpha =
        ALERT_ALPHA_MIN +
        (ALERT_ALPHA_MAX - ALERT_ALPHA_MIN) * (PULSE_PHASE_BIAS + PULSE_PHASE_AMP * Math.cos(phase * Math.PI * 2));
    for (const row of positions.byHash.values()) {
        if (row.location_plane !== plane) continue;
        const ix = (row.location_x - meta.origin_world_x) * meta.pixels_per_tile;
        const iy = (meta.top_world_y - row.location_y) * meta.pixels_per_tile;
        const px = ix * SCALE_X;
        const py = iy * SCALE_Y;
        const isAlerted = alertedHashes.has(row.account_hash);
        if (isAlerted) ctx.globalAlpha = alertAlpha;
        ctx.beginPath();
        ctx.arc(px, py, BLIP_RADIUS, 0, TWO_PI);
        ctx.fill();
        ctx.stroke();
        if (isAlerted) ctx.globalAlpha = 1;
    }
}

export function clanMapMinimap(props: MinimapProps): Instance<HTMLElement> {
    const bg = image({
        src: previewUrl(props.activePlane$()),
        width: MINIMAP_W,
        height: MINIMAP_H,
        alt: "world map preview",
        classes: ["clan-map__minimap-bg"],
        lazy: false,
        context: null,
        meta: null,
    });
    const overlay = scratchCanvas({
        width: MINIMAP_W,
        height: MINIMAP_H,
        classes: ["clan-map__minimap-overlay"],
        context: null,
        meta: null,
    });

    effect(() => {
        bg.el.src = previewUrl(props.activePlane$());
    });

    const ctx = overlay.el.getContext("2d");
    let paintScheduled = false;
    function doPaint(): void {
        paintScheduled = false;
        if (ctx === null) return;
        paintMinimap({
            ctx,
            viewport: props.viewport$(),
            positions: props.positions$(),
            plane: props.activePlane$(),
            alertedHashes: props.alertedHashes$(),
        });
    }
    function schedulePaint(): void {
        if (paintScheduled) return;
        paintScheduled = true;
        scheduleOp(doPaint, "animation");
    }
    effect(() => {
        props.viewport$();
        props.positions$();
        props.activePlane$();
        props.alertedHashes$();
        props.paintTick$();
        schedulePaint();
    });

    const animator = makeViewportAnimator(props.viewport$, clampToAtlas);

    let dragging = false;
    const targetViewportFromMinimapPoint = (clientX: number, clientY: number): AtlasBox => {
        const rect = overlay.el.getBoundingClientRect();
        const ax = (((clientX - rect.left) / rect.width) * MINIMAP_W) / SCALE_X;
        const ay = (((clientY - rect.top) / rect.height) * MINIMAP_H) / SCALE_Y;
        const cur = props.viewport$();
        return clampToAtlas({ x: ax - cur.w / 2, y: ay - cur.h / 2, w: cur.w, h: cur.h });
    };
    const setViewportFromMinimapPoint = (clientX: number, clientY: number): void => {
        props.viewport$.set(targetViewportFromMinimapPoint(clientX, clientY));
    };
    const onPointerDown = (e: PointerEvent): void => {
        if (props.followedHash$() !== null) return;
        if (e.button !== 0) return;
        dragging = true;
        overlay.el.setPointerCapture(e.pointerId);
        animator.start(targetViewportFromMinimapPoint(e.clientX, e.clientY));
        props.mode$.set("manual");
    };
    const onPointerMove = (e: PointerEvent): void => {
        if (!dragging) return;
        setViewportFromMinimapPoint(e.clientX, e.clientY);
    };
    const onPointerEnd = (e: PointerEvent): void => {
        if (!dragging) return;
        dragging = false;
        if (overlay.el.hasPointerCapture(e.pointerId)) {
            overlay.el.releasePointerCapture(e.pointerId);
        }
    };
    overlay.el.addEventListener("pointerdown", onPointerDown);
    overlay.el.addEventListener("pointermove", onPointerMove);
    overlay.el.addEventListener("pointerup", onPointerEnd);
    overlay.el.addEventListener("pointercancel", onPointerEnd);
    overlay.el.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const rect = overlay.el.getBoundingClientRect();
            const factor = Math.exp(e.deltaY * WHEEL_ZOOM_PER_PIXEL);
            const { next, followed } = computeNextViewportAtlasAnchor({
                viewport: props.viewport$(),
                factor,
                anchorAtlasX: (((e.clientX - rect.left) / rect.width) * MINIMAP_W) / SCALE_X,
                anchorAtlasY: (((e.clientY - rect.top) / rect.height) * MINIMAP_H) / SCALE_Y,
                followAtlasPoint: followedAtlasPoint(props.positions$(), props.followedHash$()),
                centerOnAnchor: true,
            });
            const clamped = clampToAtlas(next);
            if (followed) {
                animator.cancel();
                props.viewport$.set(clamped);
            } else {
                animator.start(clamped);
                props.mode$.set("manual");
            }
        },
        { passive: false },
    );
    effect(() => {
        overlay.el.classList.toggle("is-follow-locked", props.followedHash$() !== null);
    });

    const collapsed$ = signal<boolean>(false);
    const wrap = div({ classes: ["clan-map__minimap-wrap"], context: null, meta: null }, [bg, overlay]);
    const eyeIcon = icon({ name: "eye", ariaHidden: true });
    const eyeSlashIcon = icon({ name: "eye-slash", ariaHidden: true });
    const iconHost = div({ classes: ["clan-map__minimap-toggle-icon"], context: null, meta: null }, [
        eyeIcon,
        eyeSlashIcon,
    ]);
    const toggleBtn = button(
        {
            ariaLabel: "Toggle minimap",
            variant: "bare",
            classes: ["clan-map__minimap-toggle"],
            onClick: () => collapsed$.set(!collapsed$()),
            context: "toggle minimap visibility",
            meta: null,
        },
        [iconHost],
    );
    effect(() => {
        const collapsed = collapsed$();
        eyeIcon.el.style.display = collapsed ? "" : "none";
        eyeSlashIcon.el.style.display = collapsed ? "none" : "";
    });

    const root = div({ classes: ["clan-map__minimap"], context: "world map minimap", meta: null }, [wrap, toggleBtn]);
    effect(() => {
        root.el.classList.toggle("is-collapsed", collapsed$());
    });
    return root;
}
