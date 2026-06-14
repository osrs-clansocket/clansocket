import stackVariantsRaw from "./stack-variants.json";
import { resolveVariant, type VariantRegistry } from "./variant-resolver.js";
import { readFirstNumber } from "./row-value-reader.js";

const BASE = "/resources/osrs/icon_item_ids";
const ID_COLUMNS: readonly string[] = ["item_id", "crop_id"];
const QUANTITY_COLUMNS: readonly string[] = ["qty", "qty_signed"];

const STACK_VARIANTS = stackVariantsRaw as unknown as VariantRegistry;

function asNumericId(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) && Number.isInteger(value) ? value : null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) return null;
        const n = Number(trimmed);
        return Number.isFinite(n) && Number.isInteger(n) ? n : null;
    }
    return null;
}

function isIdColumn(column: string): boolean {
    for (const c of ID_COLUMNS) {
        if (c === column) return true;
    }
    return false;
}

function readAbsQuantity(row: Record<string, unknown>): number | null {
    const n = readFirstNumber(row, QUANTITY_COLUMNS);
    return n === null ? null : Math.abs(n);
}

function buildPath(id: number, row: Record<string, unknown>): string {
    const finalId = resolveVariant(STACK_VARIANTS, id, readAbsQuantity(row));
    return `${BASE}/${finalId}.webp`;
}

export function resolveItemAsset(
    _table: string,
    column: string,
    value: unknown,
    row: Record<string, unknown>,
): string | null {
    if (isIdColumn(column)) {
        const id = asNumericId(value);
        return id === null ? null : buildPath(id, row);
    }
    for (const idCol of ID_COLUMNS) {
        const siblingId = asNumericId(row[idCol]);
        if (siblingId !== null) return buildPath(siblingId, row);
    }
    return null;
}
