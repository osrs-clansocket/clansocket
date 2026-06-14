import { keyedDiv, keyedDivWithAttrs, type ContextProps, type Instance } from "../../core/index.js";
import type { EffectProp } from "../../effect-helpers.js";
import { section } from "../../layout-ops/structural/section.js";
import { panel } from "../../layout-ops/structural/panel.js";
import { panelTitle, span } from "../../content-ops/text.js";
import { canvas } from "../../content-ops/graphics/media.js";

const CHART_CARD_CLASS = "chart-card";
const DEFAULT_EFFECT: EffectProp = { name: "rise", trigger: "intersect", once: true };
const SUFFIX_PANEL = "__panel";
const SUFFIX_HEAD = "__head";
const SUFFIX_CAPTION = "__caption";
const SUFFIX_CHART_WRAP = "__chart-wrap";
const SUFFIX_CANVAS_HOST = "__canvas-host";
const KEY_SECTION = "-section";
const KEY_PANEL = "-panel";
const KEY_HEAD = "-head";
const KEY_HEADING = "-heading";
const KEY_CAPTION = "-caption";
const KEY_CHART = "-chart";
const KEY_CANVAS = "-canvas-host";

interface ChartCardProps extends ContextProps {
    name: string;
    titleText: string;
    captionText: string;
    chartKind: string;
    chartData: string;
    width: number;
    height: number;
    ariaTitle?: string;
}

function headPart(name: string, titleText: string, captionText: string): Instance {
    return keyedDiv(`${name}${SUFFIX_HEAD}`, `${name}${KEY_HEAD}`, [
        panelTitle({ key: `${name}${KEY_HEADING}`, text: titleText }),
        span({ key: `${name}${KEY_CAPTION}`, classes: [`${name}${SUFFIX_CAPTION}`], text: captionText }),
    ]);
}

function hostPart(props: ChartCardProps): Instance {
    const chartKey = `${props.name}${KEY_CANVAS}`;
    return keyedDiv(`${props.name}${SUFFIX_CANVAS_HOST}`, chartKey, [
        canvas({
            chartKind: props.chartKind,
            chartData: props.chartData,
            chartKey,
            width: props.width,
            height: props.height,
            title: props.ariaTitle,
        }),
    ]);
}

function wrapPart(props: ChartCardProps): Instance {
    return keyedDivWithAttrs(
        `${props.name}${SUFFIX_CHART_WRAP}`,
        `${props.name}${KEY_CHART}`,
        { [`data-${props.name}-chart`]: "" },
        [hostPart(props)],
    );
}

function chartCard(props: ChartCardProps): Instance {
    const inner = panel(
        { variant: "full", key: `${props.name}${KEY_PANEL}`, classes: [`${props.name}${SUFFIX_PANEL}`] },
        [headPart(props.name, props.titleText, props.captionText), wrapPart(props)],
    );
    return section(
        {
            key: `${props.name}${KEY_SECTION}`,
            classes: [props.name, CHART_CARD_CLASS],
            attrs: { id: props.name },
            effects: DEFAULT_EFFECT,
            context: props.context,
            meta: props.meta,
        },
        [inner],
    );
}

export { chartCard };
export type { ChartCardProps };
