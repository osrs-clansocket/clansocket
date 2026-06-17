"use strict";

// Var NAMES (not file paths) that `var(--X)` uses may reference even though
// `--X` is not declared under styles/tokens/ or styles/auto-gen/.
// Reserved for tokens injected at runtime (JS element.style / setProperty)
// whose value is computed per-element and cannot live in a static tokens file.
// Each entry needs the setter file:line as its reason. Invariant-12 gated:
// never add here to silence a typo / dangling-after-rename — fix the css.

module.exports = [
    { name: "--nav-icon-accent", reason: "per-page accent set in managers/header-nav.ts:70 (btn.style.setProperty)" },
    { name: "--clan-accent", reason: "per-clan accent set in dom/clans/profile/clan/clan-row.ts:35 + workflows/request-management/{helpers,chips}.ts" },
    { name: "--branding-accent", reason: "per-clan branding accent set in dom/clans/profile/branding/branding-controller/avatar-render.ts:13" },
    { name: "--data-rights-top", reason: "measured header height set in dom/data-rights/chrome-offsets.ts:7 (setDynProp)" },
    { name: "--data-rights-bottom", reason: "measured ai-bar height set in dom/data-rights/chrome-offsets.ts:8 (setDynProp)" },
    { name: "--ai-history-h", reason: "persisted resize height set in dom/ai/panel/layout/resize-storage.ts:6 (CSS_VAR)" },
    { name: "--ai-bar-h", reason: "measured ai-bar height set in dom/ai/panel/layout/bar-height.ts:3 (BAR_HEIGHT_VAR)" },
    { name: "--site-logo-scale", reason: "owner-set homepage logo scale, set in dom/pages/routes/render-home.ts:applyScale (setDynProp)" },
];
