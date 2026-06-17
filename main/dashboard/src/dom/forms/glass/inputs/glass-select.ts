import {
    BTN_VARIANT_BARE,
    button,
    div,
    input,
    path,
    slidePanel,
    span,
    svg,
    wireClick,
    wireInput,
    type Instance,
    type SlidePanelInstance,
} from "../../../factory/index.js";

const CLASS_ROOT = "glass-select";
const CLASS_TRIGGER = "glass-select__trigger";
const CLASS_LABEL = "glass-select__label";
const CLASS_PANEL = "glass-select__panel";
const CLASS_PANEL_INNER = "glass-select__panel-inner";
const CLASS_GRID = "glass-select__grid";
const CLASS_SEARCH = "glass-select__search";
const CLASS_OPTION = "glass-select__option";
const CLASS_OPTION_HIDDEN = "glass-select__option--hidden";
const CLASS_CHEVRON = "glass-select__chevron";
const ATTR_SELECTED = "aria-selected";
const DATA_KEY_VALUE = "value";
const ATTR_VALUE = `data-${DATA_KEY_VALUE}`;
const CHEVRON_PATH = "M3.5 6L8 10.5L12.5 6";
const SEARCH_THRESHOLD = 12;

const openInstances = new Set<SlidePanelInstance>();

interface SelectOption {
    value: string;
    label: string;
}

function buildChevron(): SVGSVGElement {
    return svg({ classes: [CLASS_CHEVRON], ariaHidden: "true", viewBox: "0 0 16 16", fill: "none" }, [
        path({
            d: CHEVRON_PATH,
            stroke: "currentColor",
            strokeWidth: "1.75",
            strokeLinecap: "round",
            strokeLinejoin: "round",
        }),
    ]).el;
}

function buildOption(opt: SelectOption, current: string): Instance<HTMLButtonElement> {
    return button({
        variant: BTN_VARIANT_BARE,
        classes: [CLASS_OPTION],
        role: "option",
        data: { [DATA_KEY_VALUE]: opt.value },
        ariaSelected: opt.value === current ? "true" : undefined,
        text: opt.label,
        context: "select this option",
        meta: ["choice"],
    });
}

function applyFilter(needle: string, optionInsts: readonly Instance<HTMLButtonElement>[]): void {
    const lower = needle.toLowerCase().trim();
    for (const opt of optionInsts) {
        const txt = (opt.el.textContent ?? "").toLowerCase();
        const matches = lower.length === 0 || txt.includes(lower);
        opt.toggleClass(CLASS_OPTION_HIDDEN, !matches);
    }
}

function buildSearchInput(optionInsts: readonly Instance<HTMLButtonElement>[]): Instance<HTMLInputElement> {
    const searchInp = input({
        classes: [CLASS_SEARCH],
        type: "text",
        placeholder: "Filter…",
        ariaLabel: "Filter options",
        autocomplete: "off",
        context: "filter the available options",
        meta: ["input"],
    });
    wireInput(searchInp.el, () => applyFilter(searchInp.el.value, optionInsts));
    return searchInp;
}

function commitSelection(
    opt: Instance<HTMLButtonElement>,
    siblings: readonly Instance<HTMLButtonElement>[],
    hidden: Instance<HTMLInputElement>,
    label: Instance,
): void {
    const value = opt.el.getAttribute(ATTR_VALUE);
    if (value === null) return;
    hidden.el.value = value;
    for (const o of siblings) {
        if (o.el.getAttribute(ATTR_VALUE) === value) o.setAttr(ATTR_SELECTED, "true");
        else o.removeAttr(ATTR_SELECTED);
    }
    label.setText(opt.el.textContent ?? value);
    hidden.el.dispatchEvent(new Event("change", { bubbles: true }));
}

function wireOptionClicks(
    options: readonly Instance<HTMLButtonElement>[],
    hidden: Instance<HTMLInputElement>,
    label: Instance,
    closePanel: () => void,
): void {
    for (const opt of options) {
        wireClick(opt.el, () => {
            commitSelection(opt, options, hidden, label);
            closePanel();
        });
    }
}

function composeSlide(trigger: Instance, panel: Instance, onCloseExtra: () => void): SlidePanelInstance {
    let slide: SlidePanelInstance | null = null;
    slide = slidePanel(
        {
            rootClasses: [CLASS_ROOT],
            panelClasses: [CLASS_PANEL],
            onOpen: () => {
                for (const other of openInstances) if (other !== slide) other.close();
                if (slide) openInstances.add(slide);
            },
            onClose: () => {
                if (slide) openInstances.delete(slide);
                onCloseExtra();
            },
            context: null,
            meta: null,
        },
        trigger,
        panel,
    );
    return slide;
}

function buildGlassSelect(name: string, options: SelectOption[], current: string): Instance {
    const triggerLabel = options.find((o) => o.value === current)?.label ?? current;
    const labelInst = span({ classes: [CLASS_LABEL], text: triggerLabel, context: null, meta: null });
    const trigger = button(
        {
            variant: BTN_VARIANT_BARE,
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
    const optionInsts = options.map((o) => buildOption(o, current));
    const grid = div({ classes: [CLASS_GRID], role: "listbox", context: null, meta: null }, optionInsts);
    const innerChildren: Instance[] =
        options.length >= SEARCH_THRESHOLD ? [buildSearchInput(optionInsts), grid] : [grid];
    const inner = div({ classes: [CLASS_PANEL_INNER], context: null, meta: null }, innerChildren);
    const panel = div({ classes: [], context: null, meta: null }, [inner]);
    const slide = composeSlide(trigger, panel, () => applyFilter("", optionInsts));
    wireOptionClicks(optionInsts, hidden, labelInst, () => slide.close());
    slide.addChild(hidden);
    return slide;
}

export { buildGlassSelect };
export type { SelectOption };
