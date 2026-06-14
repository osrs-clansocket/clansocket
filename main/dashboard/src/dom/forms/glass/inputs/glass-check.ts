import { effect, input, label, path, span, svg, wireChange, type Instance } from "../../../factory/index.js";

const CLASS_ROOT = "glass-check";
const CLASS_NATIVE = "glass-check__native";
const CLASS_VISUAL = "glass-check__visual";
const CLASS_MARK = "glass-check__mark";
const TYPE_CHECKBOX = "checkbox";
const CHECK_PATH = "M3 7.25L5.75 10L11 4.25";

interface GlassCheckOptions {
    name: string;
    checked: () => boolean;
    ariaLabel?: string;
    onChange?: (next: boolean) => void;
}

function buildCheckMark(): SVGSVGElement {
    return svg({ classes: [CLASS_MARK], ariaHidden: "true", viewBox: "0 0 14 14", fill: "none" }, [
        path({
            d: CHECK_PATH,
            stroke: "currentColor",
            strokeWidth: "2.25",
            strokeLinecap: "round",
            strokeLinejoin: "round",
        }),
    ]).el;
}

function buildGlassCheck(opts: GlassCheckOptions): Instance<HTMLLabelElement> {
    const { name, checked, ariaLabel, onChange } = opts;
    const ariaText = ariaLabel ?? name;
    const checkbox = input({
        classes: [CLASS_NATIVE],
        ariaLabel: ariaText,
        type: TYPE_CHECKBOX,
        name,
        context: `toggle the ${ariaText} flag`,
        meta: ["input"],
    });
    checkbox.trackDispose(
        effect(() => {
            const next = checked();
            if (checkbox.el.checked !== next) checkbox.el.checked = next;
        }),
    );
    if (onChange) {
        wireChange(checkbox.el, () => onChange(checkbox.el.checked));
    }
    return label({ classes: [CLASS_ROOT], context: null, meta: null }, [
        checkbox,
        span({ classes: [CLASS_VISUAL], context: null, meta: null }, [buildCheckMark()]),
    ]);
}

export { buildGlassCheck };
export type { GlassCheckOptions };
