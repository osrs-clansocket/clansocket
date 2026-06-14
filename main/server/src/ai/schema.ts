export type FieldType = "text" | "html" | "url" | "color" | "number" | "icon" | "enum";

export interface FieldConstraint {
    type: FieldType;
    maxLength?: number;
    min?: number;
    max?: number;
    enumValues?: string[];
    pattern?: string;
    required?: boolean;
    defaultValue?: string;
    section?: string;
    description?: string;
}

export type ActionSchema = Record<string, FieldConstraint>;

const MAX_PX = 9999;
const HEX_SHORT_LEN = 4;
const HEX_LEN = 7;
const HEX_ALPHA_LEN = 9;

function numRange(min: number, max: number, description?: string): FieldConstraint {
    return description !== undefined ? { type: "number", min, max, description } : { type: "number", min, max };
}

function paddingPx(): FieldConstraint {
    return numRange(0, MAX_PX);
}

function marginPx(): FieldConstraint {
    return numRange(-MAX_PX, MAX_PX);
}

export const META_SCHEMA: ActionSchema = {
    "meta.title": { type: "text", maxLength: 70, description: "Page title (browser tab)" },
    "meta.description": { type: "text", maxLength: 160, description: "Search engine description" },
    "meta.keywords": { type: "text", maxLength: 200 },
    "meta.author": { type: "text", maxLength: 60 },
    "meta.lang": { type: "text", maxLength: 5, defaultValue: "en" },
    "meta.favicon": { type: "url", maxLength: 500 },
    "meta.og_title": { type: "text", maxLength: 70 },
    "meta.og_description": { type: "text", maxLength: 200 },
    "meta.og_image": { type: "url", maxLength: 500 },
    "meta.og_url": { type: "url", maxLength: 500 },
    "meta.og_type": { type: "enum", enumValues: ["website", "article", "profile"], defaultValue: "website" },
    "meta.canonical": { type: "url", maxLength: 500 },
    "meta.theme_color": { type: "color" },
};

export const STYLE_SCHEMA: ActionSchema = {
    fontSize: numRange(8, 200, "Font size in px"),
    fontWeight: { type: "enum", enumValues: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
    lineHeight: numRange(0.5, 5),
    letterSpacing: numRange(-10, 50),
    textTransform: { type: "enum", enumValues: ["none", "uppercase", "lowercase", "capitalize"] },
    textAlign: { type: "enum", enumValues: ["left", "center", "right", "justify"] },
    color: { type: "color" },
    backgroundColor: { type: "color" },
    opacity: numRange(0, 1),
    borderWidth: numRange(0, 100),
    borderStyle: { type: "enum", enumValues: ["none", "solid", "dashed", "dotted", "double"] },
    borderColor: { type: "color" },
    borderRadius: paddingPx(),
    paddingTop: paddingPx(),
    paddingRight: paddingPx(),
    paddingBottom: paddingPx(),
    paddingLeft: paddingPx(),
    marginTop: marginPx(),
    marginRight: marginPx(),
    marginBottom: marginPx(),
    marginLeft: marginPx(),
    width: paddingPx(),
    height: paddingPx(),
    backgroundSize: { type: "enum", enumValues: ["cover", "contain", "auto", "100% 100%"] },
    backgroundPosition: {
        type: "enum",
        enumValues: [
            "center",
            "top",
            "bottom",
            "left",
            "right",
            "top left",
            "top right",
            "bottom left",
            "bottom right",
        ],
    },
    backgroundRepeat: { type: "enum", enumValues: ["no-repeat", "repeat", "repeat-x", "repeat-y", "space"] },
};

export const PRESET_SCHEMA: FieldConstraint = {
    type: "color",
    description: "Color preset value (hex)",
};

export function validateField(key: string, value: string, constraint: FieldConstraint): string | null {
    if (constraint.required && !value) return `${key}: required`;
    if (!value) return null;
    if (constraint.maxLength && value.length > constraint.maxLength) {
        return `${key}: exceeds max length ${constraint.maxLength} (got ${value.length})`;
    }
    if (constraint.type === "number") {
        const n = parseFloat(value);
        if (isNaN(n)) return `${key}: not a valid number`;
        if (constraint.min !== undefined && n < constraint.min) return `${key}: below min ${constraint.min}`;
        if (constraint.max !== undefined && n > constraint.max) return `${key}: above max ${constraint.max}`;
    }
    if (constraint.type === "color" && !isValidColor(value)) {
        return `${key}: not a valid color`;
    }
    if (constraint.type === "enum" && constraint.enumValues && !constraint.enumValues.includes(value)) {
        return `${key}: must be one of [${constraint.enumValues.join(", ")}]`;
    }
    return null;
}

const HEX_COLOR_LENGTHS = new Set([HEX_SHORT_LEN, HEX_LEN, HEX_ALPHA_LEN]);
const NAMED_COLORS = new Set(["transparent", "inherit", "currentColor"]);

function isValidColor(v: string): boolean {
    if (v[0] === "#" && HEX_COLOR_LENGTHS.has(v.length)) return true;
    if (v.startsWith("rgb") || v.startsWith("hsl")) return true;
    return NAMED_COLORS.has(v);
}
