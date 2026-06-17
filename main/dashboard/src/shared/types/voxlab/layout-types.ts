export const LAYOUT_SCHEMA_VERSION = 1 as const;

export type LayoutSide = "left" | "right";

export interface LayoutEntry {
    id: string;
    collapsed: boolean;
}

export interface LayoutState {
    schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
    left: LayoutEntry[];
    right: LayoutEntry[];
}
