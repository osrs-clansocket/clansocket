import { createColorPicker } from "../../dom/forms/glass/inputs/glass-color.js";

export interface ControlPair<E extends HTMLElement> {
    wrapper: HTMLElement;
    input: E;
    valueLabel?: HTMLSpanElement;
}

export interface NumberInputConfig {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
}

export interface SliderInputConfig {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    formatValue?: (n: number) => string;
}

export interface ToggleInputConfig {
    label: string;
    checked: boolean;
}

export interface ColorInputConfig {
    label: string;
    value: string;
}

export function createNumberInput(config: NumberInputConfig): ControlPair<HTMLInputElement> {
    const wrapper = createWrapper("voxlab__control--number");
    wrapper.appendChild(createLabel(config.label));
    const input = document.createElement("input");
    input.type = "number";
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(config.value);
    wrapper.appendChild(input);
    return { wrapper, input };
}

export function createSliderInput(config: SliderInputConfig): ControlPair<HTMLInputElement> {
    const wrapper = createWrapper("voxlab__control--slider");
    wrapper.appendChild(createLabel(config.label));
    const input = document.createElement("input");
    input.type = "range";
    input.className = "voxlab__control-slider";
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(config.value);
    const valueLabel = document.createElement("span");
    valueLabel.className = "voxlab__control-value";
    const format = config.formatValue ?? ((n: number): string => n.toFixed(2));
    valueLabel.textContent = format(config.value);
    input.addEventListener("input", () => {
        valueLabel.textContent = format(Number.parseFloat(input.value));
    });
    wrapper.appendChild(input);
    wrapper.appendChild(valueLabel);
    return { wrapper, input, valueLabel };
}

export function createToggleInput(config: ToggleInputConfig): ControlPair<HTMLInputElement> {
    const wrapper = createWrapper("voxlab__control--toggle");
    const label = document.createElement("label");
    label.className = "voxlab__control-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = config.checked;
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${config.label}`));
    wrapper.appendChild(label);
    return { wrapper, input };
}

export function createColorInput(config: ColorInputConfig): ControlPair<HTMLInputElement> {
    // Route to the custom themed picker. The picker owns the wrapper element
    // and a hidden carrier input whose value === current hex; consumers wire
    // the same way they would with a native <input type="color">.
    const handle = createColorPicker(config.label, config.value);
    return { wrapper: handle.wrapper, input: handle.input };
}

function createWrapper(extraClass?: string): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = extraClass ? `voxlab__control ${extraClass}` : "voxlab__control";
    return wrapper;
}

function createLabel(text: string): HTMLLabelElement {
    const label = document.createElement("label");
    label.textContent = text;
    return label;
}
