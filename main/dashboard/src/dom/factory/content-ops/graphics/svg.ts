const SVG_NS = "http://www.w3.org/2000/svg";

const ATTR_ARIA_LABEL = "aria-label";
const ATTR_ARIA_HIDDEN = "aria-hidden";
const ATTR_TITLE = "title";

const SVG_PROP_TO_ATTR: Readonly<Record<string, string>> = {
    strokeWidth: "stroke-width",
    strokeLinecap: "stroke-linecap",
    strokeLinejoin: "stroke-linejoin",
    strokeDasharray: "stroke-dasharray",
    strokeOpacity: "stroke-opacity",
    fillOpacity: "fill-opacity",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    fillRule: "fill-rule",
    colorInterpolationFilters: "color-interpolation-filters",
    pointerEvents: "pointer-events",
};

const SVG_TYPED_PROPS = [
    "id",
    "transform",
    "filter",
    "mask",
    "opacity",
    "viewBox",
    "preserveAspectRatio",
    "xmlns",
    "x",
    "y",
    "width",
    "height",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x1",
    "y1",
    "x2",
    "y2",
    "points",
    "d",
    "fill",
    "stroke",
    "strokeWidth",
    "strokeLinecap",
    "strokeLinejoin",
    "strokeDasharray",
    "strokeOpacity",
    "fillOpacity",
    "clipPath",
    "clipRule",
    "fillRule",
    "colorInterpolationFilters",
    "pointerEvents",
    "in",
    "in2",
    "result",
    "stdDeviation",
    "type",
    "baseFrequency",
    "numOctaves",
    "seed",
    "scale",
    "xChannelSelector",
    "yChannelSelector",
    "values",
    "tableValues",
    "mode",
    "amplitude",
    "exponent",
    "offset",
    "slope",
    "intercept",
] as const;

type SvgTypedKey = (typeof SVG_TYPED_PROPS)[number];
type SvgTypedProps = { [K in SvgTypedKey]?: string };

type SvgChild = SVGElement | string | SvgInstance;

interface SvgInstance<T extends SVGElement = SVGElement> {
    el: T;
    addChild(child: SvgChild): SvgInstance<T>;
    setChildren(...children: readonly SvgChild[]): SvgInstance<T>;
    setAttr(name: string, value: string | null): SvgInstance<T>;
    clear(): SvgInstance<T>;
    destroy(): void;
}

interface SvgSpec extends SvgTypedProps {
    tag: string;
    attrs?: Record<string, string>;
    ariaLabel?: string;
    ariaHidden?: string;
    title?: string;
    classes?: readonly string[];
    children?: readonly SvgChild[];
}

type SvgProps = SvgTypedProps & {
    attrs?: Record<string, string>;
    ariaLabel?: string;
    ariaHidden?: string;
    title?: string;
    classes?: readonly string[];
};

function toSvgNode(child: SvgChild): Node {
    if (typeof child === "string") return document.createTextNode(child);
    if (child instanceof Node) return child;
    return child.el;
}

function svgChain<T>(self: T, op: () => void): T {
    op();
    return self;
}

function createSvgInstance<T extends SVGElement>(el: T): SvgInstance<T> {
    const self: SvgInstance<T> = {
        el,
        addChild: (child) => svgChain(self, () => el.appendChild(toSvgNode(child))),
        setChildren: (...children) =>
            svgChain(self, () => {
                el.replaceChildren();
                for (const child of children) el.appendChild(toSvgNode(child));
            }),
        setAttr: (name, value) =>
            svgChain(self, () => {
                if (value === null) el.removeAttribute(name);
                else el.setAttribute(name, value);
            }),
        clear: () => svgChain(self, () => el.replaceChildren()),
        destroy: () => el.remove(),
    };
    return self;
}

function buildSvg<T extends SVGElement>(spec: SvgSpec): SvgInstance<T> {
    const el = document.createElementNS(SVG_NS, spec.tag) as T;
    if (spec.classes && spec.classes.length > 0) el.setAttribute("class", spec.classes.join(" "));
    if (spec.attrs) for (const [k, v] of Object.entries(spec.attrs)) el.setAttribute(k, v);
    for (const key of SVG_TYPED_PROPS) {
        const value = (spec as unknown as Record<string, unknown>)[key];
        if (typeof value !== "string") continue;
        const attrName = SVG_PROP_TO_ATTR[key] ?? key;
        el.setAttribute(attrName, value);
    }
    if (spec.ariaLabel !== undefined) el.setAttribute(ATTR_ARIA_LABEL, spec.ariaLabel);
    if (spec.ariaHidden !== undefined) el.setAttribute(ATTR_ARIA_HIDDEN, spec.ariaHidden);
    if (spec.title !== undefined) el.setAttribute(ATTR_TITLE, spec.title);
    const inst = createSvgInstance(el);
    if (spec.children) for (const child of spec.children) inst.addChild(child);
    return inst;
}

type SvgPrimitive<T extends SVGElement = SVGElement> = (
    props?: SvgProps,
    children?: readonly SvgChild[],
) => SvgInstance<T>;

function svgPrimitive<T extends SVGElement = SVGElement>(tag: string): SvgPrimitive<T> {
    return (props = {}, children = []) =>
        buildSvg<T>({
            ...props,
            tag,
            children,
        });
}

const svg = svgPrimitive<SVGSVGElement>("svg");
const defs = svgPrimitive("defs");
const path = svgPrimitive<SVGPathElement>("path");
const svgFilter = svgPrimitive("filter");
const feGaussianBlur = svgPrimitive("feGaussianBlur");
const feTurbulence = svgPrimitive("feTurbulence");
const feDisplacementMap = svgPrimitive("feDisplacementMap");
const feMerge = svgPrimitive("feMerge");
const feMergeNode = svgPrimitive("feMergeNode");
const feColorMatrix = svgPrimitive("feColorMatrix");
const feComponentTransfer = svgPrimitive("feComponentTransfer");
const feFuncR = svgPrimitive("feFuncR");
const feFuncG = svgPrimitive("feFuncG");
const feFuncB = svgPrimitive("feFuncB");

export {
    svg,
    defs,
    path,
    svgFilter,
    feGaussianBlur,
    feTurbulence,
    feDisplacementMap,
    feMerge,
    feMergeNode,
    feColorMatrix,
    feComponentTransfer,
    feFuncR,
    feFuncG,
    feFuncB,
    buildSvg,
    svgPrimitive,
    createSvgInstance,
};
export type { SvgInstance, SvgChild, SvgSpec, SvgPrimitive };
