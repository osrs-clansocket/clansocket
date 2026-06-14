import { build, keyedDiv, type ContextProps, type Instance } from "../../core/index.js";
import type { EffectProp } from "../../effect-helpers.js";
import { section } from "../../layout-ops/structural/section.js";
import { panel } from "../../layout-ops/structural/panel.js";
import { panelTitle, span } from "../../content-ops/text.js";

const LIST_CARD_CLASS = "list-card";
const DEFAULT_EFFECT: EffectProp = { name: "rise", trigger: "intersect", once: true };
const SCROLL_THIN_CLASS = "scroll-thin";
const TAG_DIV = "div";
const SUFFIX_PANEL = "__panel";
const SUFFIX_HEAD = "__head";
const SUFFIX_CAPTION = "__caption";
const SUFFIX_LIST = "__list";
const KEY_SECTION = "-section";
const KEY_PANEL = "-panel";
const KEY_HEAD = "-head";
const KEY_HEADING = "-heading";
const KEY_CAPTION = "-caption";
const KEY_LIST = "-list";

interface ListCardProps extends ContextProps {
    name: string;
    titleText: string;
    captionText: string;
    scrollable?: boolean;
}

function headPart(name: string, titleText: string, captionText: string): Instance {
    return keyedDiv(`${name}${SUFFIX_HEAD}`, `${name}${KEY_HEAD}`, [
        panelTitle({ key: `${name}${KEY_HEADING}`, text: titleText }),
        span({ key: `${name}${KEY_CAPTION}`, classes: [`${name}${SUFFIX_CAPTION}`], text: captionText }),
    ]);
}

function listClasses(name: string, scrollable: boolean): readonly string[] {
    const base = `${name}${SUFFIX_LIST}`;
    return scrollable ? [base, SCROLL_THIN_CLASS] : [base];
}

function listSlot(name: string, scrollable: boolean): Instance {
    return build({
        tag: TAG_DIV,
        classes: listClasses(name, scrollable),
        attrs: { [`data-${name}-list`]: "" },
        key: `${name}${KEY_LIST}`,
    });
}

function listCard(props: ListCardProps): Instance {
    const scrollable = props.scrollable !== false;
    const inner = panel(
        { variant: "full", key: `${props.name}${KEY_PANEL}`, classes: [`${props.name}${SUFFIX_PANEL}`] },
        [headPart(props.name, props.titleText, props.captionText), listSlot(props.name, scrollable)],
    );
    return section(
        {
            key: `${props.name}${KEY_SECTION}`,
            classes: [props.name, LIST_CARD_CLASS],
            attrs: { id: props.name },
            effects: DEFAULT_EFFECT,
            context: props.context,
            meta: props.meta,
        },
        [inner],
    );
}

export { listCard };
export type { ListCardProps };
