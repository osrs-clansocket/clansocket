import { button, div, input, path, popover, span, svg, wireClick, type Instance } from "../../../factory/index.js";

const CLASS_ROOT = "glass-select";
const CLASS_OPEN = "glass-select--open";
const CLASS_TRIGGER = "glass-select__trigger";
const CLASS_LABEL = "glass-select__label";
const CLASS_OPTION = "glass-select__option";
const CLASS_POPUP = "glass-select__popup";
const CLASS_CHEVRON = "glass-select__chevron";
const ATTR_SELECTED = "aria-selected";
const DATA_KEY_VALUE = "value";
const ATTR_VALUE = `data-${DATA_KEY_VALUE}`;
const CHEVRON_PATH = "M3.5 6L8 10.5L12.5 6";

interface SelectOption {
    value: string;
    label: string;
}

function buildChevron(): SVGSVGElement {
    return svg(
        {
            classes: [CLASS_CHEVRON],
            ariaHidden: "true",
            viewBox: "0 0 16 16",
            fill: "none",
        },
        [
            path({
                d: CHEVRON_PATH,
                stroke: "currentColor",
                strokeWidth: "1.75",
                strokeLinecap: "round",
                strokeLinejoin: "round",
            }),
        ],
    ).el;
}

function buildGlassSelect(name: string, options: SelectOption[], current: string): Instance {
    const triggerLabel = options.find((o) => o.value === current)?.label ?? current;
    const labelInst = span({ classes: [CLASS_LABEL], text: triggerLabel, context: null, meta: null });
    const trigger = button(
        {
            ariaLabel: "Open select",
            classes: [CLASS_TRIGGER],
            ariaHaspopup: "listbox",
            context: "open the select dropdown",
            meta: ["action", "choice"],
        },
        [labelInst, buildChevron()],
    );
    const hidden = input({
        ariaLabel: "Selected value",
        name,
        type: "hidden",
        value: current,
        context: "the selected value (hidden field)",
        meta: ["input"],
    });
    const optionInsts: Instance<HTMLButtonElement>[] = [];
    const popup = div(
        { classes: [CLASS_POPUP], role: "listbox", context: null, meta: null },
        options.map((o) => {
            const opt = button({
                classes: [CLASS_OPTION],
                role: "option",
                data: { [DATA_KEY_VALUE]: o.value },
                ariaSelected: o.value === current ? "true" : undefined,
                text: o.label,
                context: "select this option",
                meta: ["choice"],
            });
            optionInsts.push(opt);
            return opt;
        }),
    );
    const inst = popover(
        {
            openClass: CLASS_OPEN,
            rootClasses: [CLASS_ROOT],
            rootAttrs: { "data-glass-select": "" },
            context: null,
            meta: null,
        },
        trigger,
        popup,
    );
    inst.addChild(hidden);
    for (const opt of optionInsts) {
        wireClick(opt.el, () => {
            const value = opt.el.getAttribute(ATTR_VALUE);
            if (value === null) return;
            hidden.el.value = value;
            for (const o of optionInsts) {
                if (o.el.getAttribute(ATTR_VALUE) === value) o.setAttr(ATTR_SELECTED, "true");
                else o.removeAttr(ATTR_SELECTED);
            }
            labelInst.setText(opt.el.textContent ?? value);
            hidden.el.dispatchEvent(new Event("change", { bubbles: true }));
            inst.close();
        });
    }
    return inst;
}

export { buildGlassSelect };
export type { SelectOption };
