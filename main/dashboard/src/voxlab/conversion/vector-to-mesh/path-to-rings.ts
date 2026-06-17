import { SVGPathData, SVGPathDataTransformer, type SVGCommand } from "svg-pathdata";
import type { Point2D } from "../raster-to-mesh/types.js";
import { flattenCubic, type CubicBezier } from "./flatten/flatten-cubic.js";
import { flattenQuadratic, type QuadraticBezier } from "./flatten/flatten-quadratic.js";
import { MIN_SEGMENT_LENGTH } from "./constants/defaults.js";

interface ParseState {
    rings: Point2D[][];
    current: Point2D[];
    startPoint: Point2D | null;
    pen: Point2D;
    tolerance: number;
}

export function pathToRings(d: string, tolerance: number): Point2D[][] {
    const normalized = new SVGPathData(d)
        .toAbs()
        .transform(SVGPathDataTransformer.NORMALIZE_ST())
        .transform(SVGPathDataTransformer.NORMALIZE_HVZ())
        .transform(SVGPathDataTransformer.A_TO_C());
    return commandsToRings(normalized.commands, tolerance);
}

function commandsToRings(cmds: readonly SVGCommand[], tolerance: number): Point2D[][] {
    const state: ParseState = {
        rings: [],
        current: [],
        startPoint: null,
        pen: { x: 0, y: 0 },
        tolerance,
    };
    for (const cmd of cmds) processCommand(state, cmd);
    finalizeCurrent(state);
    return state.rings;
}

function processCommand(state: ParseState, cmd: SVGCommand): void {
    switch (cmd.type) {
        case SVGPathData.MOVE_TO:
            return handleMoveTo(state, cmd.x, cmd.y);
        case SVGPathData.LINE_TO:
            return handleLineTo(state, cmd.x, cmd.y);
        case SVGPathData.CURVE_TO:
            return handleCubic(state, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        case SVGPathData.QUAD_TO:
            return handleQuadratic(state, cmd.x1, cmd.y1, cmd.x, cmd.y);
        case SVGPathData.CLOSE_PATH:
            return handleClosePath(state);
    }
}

function handleMoveTo(state: ParseState, x: number, y: number): void {
    finalizeCurrent(state);
    state.current = [{ x, y }];
    state.startPoint = { x, y };
    state.pen = { x, y };
}

function handleLineTo(state: ParseState, x: number, y: number): void {
    state.current.push({ x, y });
    state.pen = { x, y };
}

function handleCubic(state: ParseState, x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    const bez: CubicBezier = {
        p0: { ...state.pen },
        p1: { x: x1, y: y1 },
        p2: { x: x2, y: y2 },
        p3: { x, y },
    };
    flattenCubic(bez, state.tolerance, state.current);
    state.pen = { x, y };
}

function handleQuadratic(state: ParseState, x1: number, y1: number, x: number, y: number): void {
    const bez: QuadraticBezier = {
        p0: { ...state.pen },
        p1: { x: x1, y: y1 },
        p2: { x, y },
    };
    flattenQuadratic(bez, state.tolerance, state.current);
    state.pen = { x, y };
}

function handleClosePath(state: ParseState): void {
    if (state.startPoint === null) return;
    state.pen = { x: state.startPoint.x, y: state.startPoint.y };
}

function finalizeCurrent(state: ParseState): void {
    if (state.current.length < 3) return;
    const cleaned = removeDegenerate(state.current);
    if (cleaned.length >= 3) state.rings.push(cleaned);
    state.current = [];
}

function removeDegenerate(ring: Point2D[]): Point2D[] {
    if (ring.length < 2) return ring;
    const out: Point2D[] = [ring[0]];
    const minSq = MIN_SEGMENT_LENGTH * MIN_SEGMENT_LENGTH;
    for (let i = 1; i < ring.length; i++) {
        const prev = out[out.length - 1];
        const curr = ring[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        if (dx * dx + dy * dy >= minSq) out.push(curr);
    }
    return out;
}
