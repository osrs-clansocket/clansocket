import { build, buildAttrs, type Instance, type AttrEntry } from "../../core/index.js";
import { applyEffects, type EffectProp } from "../../effect-helpers.js";
import type { ContextProps } from "../../core/types.js";
import type { ReactiveValue } from "../../reactive.js";
import { buildIconClasses, buildIconSrc, ensureFamilyCss, getProvider } from "../../../../icons/providers.js";

const TAG_I = "i";
const TAG_IMG = "img";
const TAG_CANVAS = "canvas";
const LOADING_LAZY = "lazy";
const ATTR_SRC = "src";
const ATTR_ALT = "alt";
const ATTR_WIDTH = "width";
const ATTR_HEIGHT = "height";
const ATTR_LOADING = "loading";
const ATTR_TITLE = "title";
const ATTR_ARIA_LABEL = "aria-label";
const ATTR_DATA_CHART_KIND = "data-chart-kind";
const ATTR_DATA_CHART_DATA = "data-chart-data";
const ATTR_DATA_CHART_KEY = "data-chart-key";
const ATTR_ARIA_HIDDEN = "aria-hidden";
const DEFAULT_ICON_PROVIDER = "bi";

interface IconProps extends ContextProps {
    name: string;
    provider?: string;
    classes?: readonly string[];
    effects?: EffectProp | readonly EffectProp[];
    alt?: string;
    title?: string;
    ariaHidden?: boolean;
}

interface ImageProps extends ContextProps {
    src: ReactiveValue<string>;
    alt?: ReactiveValue<string>;
    title?: ReactiveValue<string>;
    width?: number;
    height?: number;
    lazy?: boolean;
    classes?: readonly string[];
}

interface CanvasProps extends ContextProps {
    chartKind: string;
    chartData: string;
    chartKey: string;
    width: number;
    height: number;
    title?: string;
    classes?: readonly string[];
}

function asStr(n: number | undefined): string | undefined {
    return n === undefined ? undefined : String(n);
}

function icon(props: IconProps): Instance<HTMLElement> {
    const provider = props.provider ?? DEFAULT_ICON_PROVIDER;
    ensureFamilyCss(provider);
    const cfg = getProvider(provider);
    const ariaHiddenAttr = props.ariaHidden ? "true" : undefined;
    if (cfg && cfg.kind === "raster") {
        const src = buildIconSrc(provider, props.name) ?? "";
        const alt = props.alt ?? props.name;
        const title = props.title ?? props.name;
        const classes = props.classes && props.classes.length > 0 ? props.classes : undefined;
        return build({
            tag: TAG_IMG,
            classes,
            attrs: buildAttrs([
                [ATTR_SRC, src],
                [ATTR_ALT, alt],
                [ATTR_TITLE, title],
                [ATTR_LOADING, LOADING_LAZY],
                [ATTR_ARIA_HIDDEN, ariaHiddenAttr],
            ]),
            effects: props.effects,
            context: props.context,
            meta: props.meta,
        });
    }
    const providerClasses = buildIconClasses(provider, props.name);
    const classes =
        props.classes && props.classes.length > 0 ? [...providerClasses, ...props.classes] : providerClasses;
    return build({
        tag: TAG_I,
        classes,
        attrs: ariaHiddenAttr ? { [ATTR_ARIA_HIDDEN]: ariaHiddenAttr } : undefined,
        effects: props.effects,
        context: props.context,
        meta: props.meta,
    });
}

function imageBaseAttrEntries(props: ImageProps): AttrEntry[] {
    const loading = props.lazy === false ? undefined : LOADING_LAZY;
    return [
        [ATTR_WIDTH, asStr(props.width)],
        [ATTR_HEIGHT, asStr(props.height)],
        [ATTR_LOADING, loading],
    ];
}

function buildTagged<T extends HTMLElement>(
    tag: string,
    classes: readonly string[] | undefined,
    attrs: Record<string, string>,
    ctx: ContextProps,
): Instance<T> {
    return build<T>({ tag, classes, attrs, context: ctx.context, meta: ctx.meta });
}

function image(props: ImageProps): Instance<HTMLImageElement> {
    const inst = buildTagged<HTMLImageElement>(TAG_IMG, props.classes, buildAttrs(imageBaseAttrEntries(props)), props);
    inst.setAttr(ATTR_SRC, props.src);
    if (props.alt !== undefined) inst.setAttr(ATTR_ALT, props.alt);
    if (props.title !== undefined) inst.setAttr(ATTR_TITLE, props.title);
    inst.el.addEventListener("load", () => applyEffects(inst.el, { name: "fade-in", once: true }), { once: true });
    return inst;
}

function canvasAttrEntries(props: CanvasProps): AttrEntry[] {
    return [
        [ATTR_WIDTH, String(props.width)],
        [ATTR_HEIGHT, String(props.height)],
        [ATTR_DATA_CHART_KIND, props.chartKind],
        [ATTR_DATA_CHART_DATA, props.chartData],
        [ATTR_DATA_CHART_KEY, props.chartKey],
        [ATTR_ARIA_LABEL, props.title],
    ];
}

function canvas(props: CanvasProps): Instance<HTMLCanvasElement> {
    return buildTagged<HTMLCanvasElement>(TAG_CANVAS, props.classes, buildAttrs(canvasAttrEntries(props)), props);
}

interface ScratchCanvasProps extends ContextProps {
    width: number;
    height: number;
    classes?: readonly string[];
}

function scratchCanvas(props: ScratchCanvasProps): Instance<HTMLCanvasElement> {
    const inst = build<HTMLCanvasElement>({
        tag: TAG_CANVAS,
        classes: props.classes,
        context: props.context,
        meta: props.meta,
    });
    inst.el.width = props.width;
    inst.el.height = props.height;
    return inst;
}

export { icon, image, canvas, scratchCanvas };
export type { IconProps, ImageProps, CanvasProps, ScratchCanvasProps };
