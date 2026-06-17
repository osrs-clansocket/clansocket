import "../../../../styles/pages/voxlab/picker-page.css";
import { createInstance, effect, type Instance } from "../../../factory/index.js";

export interface ColorPickerHandle {
    wrapper: HTMLElement;
    input: HTMLInputElement;
}

export interface GlassColorOptions {
    name: string;
    value: () => string;
    ariaLabel?: string;
    onChange?: (next: string) => void;
}

export function createColorPicker(label: string, initial: string): ColorPickerHandle {
    const wrapper = document.createElement("div");
    wrapper.className = "voxlab__control voxlab__control--color";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    const inner = buildColorSwatch({
        ariaLabel: `${label}: open color picker`,
        initial,
    });
    wrapper.appendChild(inner.swatchHost);

    return { wrapper, input: inner.carrier };
}

export function buildGlassColor(opts: GlassColorOptions): Instance<HTMLDivElement> {
    const { value, ariaLabel, name, onChange } = opts;
    const ariaText = ariaLabel ?? name;
    const inner = buildColorSwatch({
        ariaLabel: `${ariaText}: open color picker`,
        initial: value(),
    });
    if (onChange) {
        inner.carrier.addEventListener("input", () => onChange(inner.carrier.value));
    }
    const inst = createInstance(inner.swatchHost as HTMLDivElement);
    inst.trackDispose(
        effect(() => {
            const next = value();
            if (inner.carrier.value !== next) {
                inner.setValue(next);
            }
        }),
    );
    return inst;
}

interface SwatchHandle {
    swatchHost: HTMLDivElement;
    carrier: HTMLInputElement;
    setValue: (hex: string) => void;
}

function buildColorSwatch(opts: { ariaLabel: string; initial: string }): SwatchHandle {
    const swatchHost = document.createElement("div");
    swatchHost.className = "voxlab__picker";

    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "voxlab__picker-swatch";
    swatch.setAttribute("aria-label", opts.ariaLabel);
    swatch.style.background = opts.initial;
    swatchHost.appendChild(swatch);

    const carrier = document.createElement("input");
    carrier.type = "hidden";
    carrier.value = opts.initial;
    swatchHost.appendChild(carrier);

    let popup: HTMLElement | null = null;

    const setValue = (hex: string): void => {
        carrier.value = hex;
        swatch.style.background = hex;
        carrier.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const close = (): void => {
        popup?.remove();
        popup = null;
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKey);
    };

    const onDocPointerDown = (e: PointerEvent): void => {
        if (!popup) return;
        if (!popup.contains(e.target as Node) && e.target !== swatch) {
            close();
        }
    };

    const onKey = (e: KeyboardEvent): void => {
        if (e.key === "Escape") {
            close();
        }
    };

    const open = (): void => {
        if (popup) {
            close();
            return;
        }
        popup = buildPopup(carrier.value, setValue);
        document.body.appendChild(popup);
        positionPopup(popup, swatch);
        setTimeout(() => {
            document.addEventListener("pointerdown", onDocPointerDown, true);
            document.addEventListener("keydown", onKey);
        }, 0);
    };

    swatch.addEventListener("click", open);

    return { swatchHost, carrier, setValue };
}

const POPUP_MARGIN = 8;

function positionPopup(popup: HTMLElement, swatch: HTMLElement): void {
    const rect = swatch.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    let left = rect.right + POPUP_MARGIN;
    if (left + popupRect.width > winW - POPUP_MARGIN) {
        left = rect.left - popupRect.width - POPUP_MARGIN;
    }
    if (left < POPUP_MARGIN) left = POPUP_MARGIN;
    let top = rect.top;
    if (top + popupRect.height > winH - POPUP_MARGIN) {
        top = winH - popupRect.height - POPUP_MARGIN;
    }
    if (top < POPUP_MARGIN) top = POPUP_MARGIN;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

function buildPopup(initial: string, onChange: (hex: string) => void): HTMLElement {
    const popup = document.createElement("div");
    popup.className = "voxlab__picker-popup voxlab__picker-popup--wide";

    const preview = document.createElement("div");
    preview.className = "voxlab__picker-popup-preview";
    preview.style.background = initial;
    popup.appendChild(preview);

    const columns = document.createElement("div");
    columns.className = "voxlab__picker-popup-columns";

    const hslCol = document.createElement("div");
    hslCol.className = "voxlab__picker-popup-column";
    const hslTitle = document.createElement("div");
    hslTitle.className = "voxlab__picker-popup-column-title";
    hslTitle.textContent = "HSL";
    hslCol.appendChild(hslTitle);

    const rgbCol = document.createElement("div");
    rgbCol.className = "voxlab__picker-popup-column";
    const rgbTitle = document.createElement("div");
    rgbTitle.className = "voxlab__picker-popup-column-title";
    rgbTitle.textContent = "RGB";
    rgbCol.appendChild(rgbTitle);

    columns.appendChild(hslCol);
    columns.appendChild(rgbCol);
    popup.appendChild(columns);

    const initialHsl = hexToHsl(initial);
    const initialRgb = hexToRgb(initial);
    let h = initialHsl.h;
    let s = initialHsl.s;
    let l = initialHsl.l;
    let r = initialRgb.r;
    let g = initialRgb.g;
    let b = initialRgb.b;

    let broadcasting = false;

    const hue = makeSlider(hslCol, "H", 0, 360, h, (v) => {
        if (broadcasting) return;
        h = v;
        pushFromHsl();
    });
    const sat = makeSlider(hslCol, "S", 0, 100, s, (v) => {
        if (broadcasting) return;
        s = v;
        pushFromHsl();
    });
    const lit = makeSlider(hslCol, "L", 0, 100, l, (v) => {
        if (broadcasting) return;
        l = v;
        pushFromHsl();
    });

    const red = makeSlider(rgbCol, "R", 0, 255, r, (v) => {
        if (broadcasting) return;
        r = v;
        pushFromRgb();
    });
    const grn = makeSlider(rgbCol, "G", 0, 255, g, (v) => {
        if (broadcasting) return;
        g = v;
        pushFromRgb();
    });
    const blu = makeSlider(rgbCol, "B", 0, 255, b, (v) => {
        if (broadcasting) return;
        b = v;
        pushFromRgb();
    });

    const hexRow = document.createElement("div");
    hexRow.className = "voxlab__picker-popup-hex";
    const hexLbl = document.createElement("label");
    hexLbl.textContent = "Hex";
    hexRow.appendChild(hexLbl);
    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.className = "voxlab__picker-popup-hex-input";
    hexInput.value = initial;
    hexInput.addEventListener("input", () => {
        if (broadcasting) return;
        const hex = normalizeHex(hexInput.value);
        if (!hex) return;
        broadcastHex(hex);
    });
    hexRow.appendChild(hexInput);
    popup.appendChild(hexRow);

    function setSlider(slot: { input: HTMLInputElement; valueEl: HTMLSpanElement }, value: number): void {
        const rounded = Math.round(value);
        slot.input.value = String(rounded);
        slot.valueEl.textContent = String(rounded);
    }

    function broadcastHex(hex: string): void {
        broadcasting = true;
        try {
            const hsl = hexToHsl(hex);
            const rgb = hexToRgb(hex);
            h = hsl.h;
            s = hsl.s;
            l = hsl.l;
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
            setSlider(hue, h);
            setSlider(sat, s);
            setSlider(lit, l);
            setSlider(red, r);
            setSlider(grn, g);
            setSlider(blu, b);
            hexInput.value = hex;
            preview.style.background = hex;
        } finally {
            broadcasting = false;
        }
        onChange(hex);
    }

    function pushFromHsl(): void {
        broadcastHex(hslToHex(h, s, l));
    }

    function pushFromRgb(): void {
        broadcastHex(rgbToHex(r, g, b));
    }

    return popup;
}

function makeSlider(
    parent: HTMLElement,
    labelText: string,
    min: number,
    max: number,
    value: number,
    onInput: (v: number) => void,
): { input: HTMLInputElement; valueEl: HTMLSpanElement } {
    const row = document.createElement("div");
    row.className = "voxlab__picker-popup-row";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    row.appendChild(lbl);
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "voxlab__control-slider";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = "1";
    slider.value = String(Math.round(value));
    row.appendChild(slider);
    const val = document.createElement("span");
    val.className = "voxlab__picker-popup-value";
    val.textContent = String(Math.round(value));
    row.appendChild(val);
    slider.addEventListener("input", () => {
        const v = Number.parseInt(slider.value, 10);
        val.textContent = String(v);
        onInput(v);
    });
    parent.appendChild(row);
    return { input: slider, valueEl: val };
}

function normalizeHex(text: string): string | null {
    const t = text.trim();
    if (!t.startsWith("#")) {
        if (isHex6(t)) return `#${t.toLowerCase()}`;
        return null;
    }
    if (isHex6(t.slice(1))) return t.toLowerCase();
    if (isHex3(t.slice(1))) {
        const r = t.charAt(1);
        const g = t.charAt(2);
        const b = t.charAt(3);
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return null;
}

function isHexChar(c: string): boolean {
    const code = c.charCodeAt(0);
    if (code >= 48 && code <= 57) return true;
    if (code >= 65 && code <= 70) return true;
    if (code >= 97 && code <= 102) return true;
    return false;
}

function isHex6(body: string): boolean {
    if (body.length !== 6) return false;
    for (let i = 0; i < 6; i++) {
        if (!isHexChar(body.charAt(i))) return false;
    }
    return true;
}

function isHex3(body: string): boolean {
    if (body.length !== 3) return false;
    for (let i = 0; i < 3; i++) {
        if (!isHexChar(body.charAt(i))) return false;
    }
    return true;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const normalized = normalizeHex(hex) ?? "#000000";
    const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
    const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
    const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }
        h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = normalizeHex(hex) ?? "#000000";
    return {
        r: Number.parseInt(normalized.slice(1, 3), 16),
        g: Number.parseInt(normalized.slice(3, 5), 16),
        b: Number.parseInt(normalized.slice(5, 7), 16),
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
    const toHex = (v: number): string => clamp(v).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslToHex(h: number, s: number, l: number): string {
    const sat = s / 100;
    const lit = l / 100;
    const k = (n: number): number => (n + h / 30) % 12;
    const a = sat * Math.min(lit, 1 - lit);
    const f = (n: number): number => {
        return lit - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    };
    const toHex = (x: number): string => {
        const v = Math.round(x * 255);
        return v.toString(16).padStart(2, "0");
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
