import { effect, input, label, span, wireChange, type Instance } from "../../../factory/index.js";

const CLASS_ROOT = "glass-color";
const CLASS_NATIVE = "glass-color__native";
const CLASS_VISUAL = "glass-color__visual";
const CLASS_SWATCH = "glass-color__swatch";
const TYPE_COLOR = "color";
const STYLE_BACKGROUND = "background";

interface GlassColorOptions {
    name: string;
    value: () => string;
    ariaLabel?: string;
    onChange?: (next: string) => void;
}

function buildGlassColor(opts: GlassColorOptions): Instance<HTMLLabelElement> {
    const { name, value, ariaLabel, onChange } = opts;
    const ariaText = ariaLabel ?? name;
    const colorInput = input({
        classes: [CLASS_NATIVE],
        ariaLabel: ariaText,
        type: TYPE_COLOR,
        name,
        context: `pick a color for ${ariaText}`,
        meta: ["input"],
    });
    colorInput.trackDispose(
        effect(() => {
            const next = value();
            if (colorInput.el.value !== next) colorInput.el.value = next;
        }),
    );
    const swatch = span({ classes: [CLASS_SWATCH], context: null, meta: null });
    swatch.trackDispose(
        effect(() => {
            swatch.el.style.setProperty(STYLE_BACKGROUND, value());
        }),
    );
    if (onChange) {
        wireChange(colorInput.el, () => {
            const next = colorInput.el.value;
            swatch.el.style.setProperty(STYLE_BACKGROUND, next);
            onChange(next);
        });
    }
    return label({ classes: [CLASS_ROOT], context: null, meta: null }, [
        colorInput,
        span({ classes: [CLASS_VISUAL], context: null, meta: null }, [swatch]),
    ]);
}

export { buildGlassColor };
export type { GlassColorOptions };
