import type { IconTransform } from "../../../../../state/clans/clans-client/index.js";

export const DEFAULT_BRAND_COLOR = "#e0c96e";
export const IDENTITY_TRANSFORM: IconTransform = { scale: 1, rotate: 0, translateX: 0, translateY: 0 };
export const AUTOSAVE_DEBOUNCE_MS = 350;

export interface TweakerListeners {
    onTransformChange?: (transform: IconTransform) => void;
    onCustomizedChange?: (hasCustomized: boolean) => void;
    onSaveStateChange?: (state: "idle" | "saving" | "error") => void;
    onIconStateChange?: () => void;
}
