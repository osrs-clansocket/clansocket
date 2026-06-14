import { button, div, input, span, wireClick, type Instance } from "../../../../factory/index.js";
import { normalizeHex } from "../../shared/format.js";
import { CUSTOM_SWATCH_CAP, loadCustomSwatches, saveCustomSwatches } from "../../shared/swatch-storage.js";
import type { BrandingController } from "../branding-controller/index.js";
import { FORM_FIELD_LABEL } from "../../../../forms/form-classes.js";
import {
    ACCOUNT_BRANDING_COLOR_BLOCK_CLASS,
    ACCOUNT_BRANDING_COLOR_PREVIEW_CLASS,
    ACCOUNT_BRANDING_HEX_CLASS,
    ACCOUNT_BRANDING_HEX_ROW_CLASS,
    ACCOUNT_BRANDING_SWATCH_ACTIVE_CLASS,
    ACCOUNT_BRANDING_SWATCH_CLASS,
    ACCOUNT_BRANDING_SWATCH_CUSTOM_CLASS,
    ACCOUNT_BRANDING_SWATCHES_CLASS,
    ACCOUNT_BRANDING_SWATCHES_DRAGGING_CLASS,
} from "../../../../../shared/constants/account-constants.js";

const BRANDING_SWATCHES: readonly string[] = [
    "#e0c96e",
    "#c9a84c",
    "#f5e6c3",
    "#8b1a1a",
    "#c92626",
    "#ff4d4d",
    "#3a1a14",
    "#5a3a36",
    "#2e7d32",
    "#4caf50",
    "#1976d2",
    "#00bcd4",
    "#7c4dff",
    "#ff7a00",
    "#e91e63",
    "#ffd700",
];
const DRAG_THRESHOLD_PX = 3;

export function buildColorPicker(ctrl: BrandingController): Instance {
    const colorPreview = span({ classes: [ACCOUNT_BRANDING_COLOR_PREVIEW_CLASS], context: null, meta: null });
    colorPreview.el.style.background = ctrl.color;
    const hexInput = input({
        classes: [ACCOUNT_BRANDING_HEX_CLASS],
        ariaLabel: "Color hex",
        type: "text",
        spellcheck: "false",
        autocomplete: "off",
        maxlength: "7",
        placeholder: "#rrggbb",
        value: ctrl.color,
        context: "enter a hex color for the clan accent",
        meta: ["input", "clan"],
        onChange: () => {
            const next = normalizeHex(hexInput.el.value);
            if (!next) {
                hexInput.el.value = ctrl.color;
                return;
            }
            if (!baseSet.has(next) && !customSwatches.includes(next)) {
                customSwatches = [...customSwatches, next].slice(-CUSTOM_SWATCH_CAP);
                saveCustomSwatches(customSwatches);
                const newInst = appendSwatch(next, true);
                requestAnimationFrame(() => {
                    newInst.el.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
                });
            }
            setColor(next, true);
        },
    });
    const swatchGrid = div({ classes: [ACCOUNT_BRANDING_SWATCHES_CLASS], context: null, meta: null });
    const swatchEntries: { color: string; inst: Instance<HTMLButtonElement> }[] = [];
    const baseSet = new Set(BRANDING_SWATCHES.map((c) => c.toLowerCase()));
    let customSwatches = loadCustomSwatches();

    const setColor = (next: string, fromHexInput: boolean): void => {
        ctrl.color = next;
        colorPreview.el.style.background = next;
        if (!fromHexInput) hexInput.el.value = next;
        for (const { color, inst } of swatchEntries) {
            inst.toggleClass(ACCOUNT_BRANDING_SWATCH_ACTIVE_CLASS, color === next);
        }
        ctrl.renderAvatar();
        void ctrl.persist(ctrl.kind, ctrl.value);
    };

    const appendSwatch = (color: string, custom: boolean): Instance<HTMLButtonElement> => {
        const sw = button({
            classes: custom
                ? [ACCOUNT_BRANDING_SWATCH_CLASS, ACCOUNT_BRANDING_SWATCH_CUSTOM_CLASS]
                : [ACCOUNT_BRANDING_SWATCH_CLASS],
            ariaLabel: color,
            title: color,
            context: "select this color for the clan accent",
            meta: ["choice", "clan"],
            onClick: () => setColor(color, false),
        });
        sw.el.style.background = color;
        if (color === ctrl.color) sw.toggleClass(ACCOUNT_BRANDING_SWATCH_ACTIVE_CLASS, true);
        if (custom) {
            sw.el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                customSwatches = customSwatches.filter((c) => c !== color);
                saveCustomSwatches(customSwatches);
                const idx = swatchEntries.findIndex((entry) => entry.inst.el === sw.el);
                if (idx >= 0) swatchEntries.splice(idx, 1);
                sw.destroy();
            });
        }
        swatchGrid.addChild(sw);
        swatchEntries.push({ color, inst: sw });
        return sw;
    };

    for (const color of BRANDING_SWATCHES) appendSwatch(color, false);
    for (const color of customSwatches) {
        if (!baseSet.has(color)) appendSwatch(color, true);
    }

    wireDragScroll(swatchGrid);

    return div({ classes: [ACCOUNT_BRANDING_COLOR_BLOCK_CLASS], context: null, meta: null }, [
        span({ classes: [FORM_FIELD_LABEL], text: "Color", context: null, meta: null }),
        swatchGrid,
        div({ classes: [ACCOUNT_BRANDING_HEX_ROW_CLASS], context: null, meta: null }, [colorPreview, hexInput]),
    ]);
}

function wireDragScroll(swatchGrid: Instance): void {
    swatchGrid.el.addEventListener(
        "wheel",
        (e) => {
            if (e.deltaY === 0) return;
            const before = swatchGrid.el.scrollLeft;
            swatchGrid.el.scrollLeft = before + e.deltaY;
            if (swatchGrid.el.scrollLeft !== before) e.preventDefault();
        },
        { passive: false },
    );

    let dragState: { startX: number; startScroll: number; pointerId: number; moved: boolean } | null = null;
    swatchGrid.el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        dragState = { startX: e.clientX, startScroll: swatchGrid.el.scrollLeft, pointerId: e.pointerId, moved: false };
    });
    swatchGrid.el.addEventListener("pointermove", (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        const dx = e.clientX - dragState.startX;
        if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
            if (!dragState.moved) {
                swatchGrid.el.setPointerCapture(dragState.pointerId);
                swatchGrid.toggleClass(ACCOUNT_BRANDING_SWATCHES_DRAGGING_CLASS, true);
            }
            dragState.moved = true;
            swatchGrid.el.scrollLeft = dragState.startScroll - dx;
        }
    });
    const endDrag = (e: PointerEvent): void => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        const wasDragging = dragState.moved;
        if (wasDragging) {
            swatchGrid.el.releasePointerCapture(dragState.pointerId);
            swatchGrid.toggleClass(ACCOUNT_BRANDING_SWATCHES_DRAGGING_CLASS, false);
            wireClick(swatchGrid.el, {
                handler: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                },
                capture: true,
                once: true,
                raw: true,
            });
        }
        dragState = null;
    };
    swatchGrid.el.addEventListener("pointerup", endDrag);
    swatchGrid.el.addEventListener("pointercancel", endDrag);
}
