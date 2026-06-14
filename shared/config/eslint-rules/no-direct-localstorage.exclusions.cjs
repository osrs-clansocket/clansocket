// Pre-existing files that use localStorage directly. Grandfathered until
// migrated to persistedSignal/persistedScope. Each entry must have a
// `reason` field explaining why it's exempt (per CLAUDE.md invariant 12).
//
// Path is the trailing path segment matched against the file under lint.
// New entries require explicit consensual override per invariant 12.

module.exports = [
    {
        file: "main/dashboard/src/ai/modes-store/storage.ts",
        reason: "predates persistedSignal helper; migrate when ai modes store gets touched",
    },
    {
        file: "main/dashboard/src/ai/persona-store/storage.ts",
        reason: "predates persistedSignal helper; migrate when ai persona store gets touched",
    },
    {
        file: "main/dashboard/src/ai/profile-store/storage.ts",
        reason: "predates persistedSignal helper; migrate when ai profile store gets touched",
    },
    {
        file: "main/dashboard/src/dom/ai/panel/layout/bar-height.ts",
        reason: "predates persistedSignal helper; ai-bar layout state",
    },
    {
        file: "main/dashboard/src/dom/ai/panel/auth/gate.ts",
        reason: "predates persistedSignal helper; auth gate state",
    },
    {
        file: "main/dashboard/src/dom/ai/onboarding/welcome.ts",
        reason: "predates persistedSignal helper; onboarding dismissal flag",
    },
    {
        file: "main/dashboard/src/bootstrap/header-auth.ts",
        reason: "predates persistedSignal helper; runs pre-app to seed auth",
    },
    {
        file: "main/dashboard/src/dom/ai/send/chain-mode-store.ts",
        reason: "predates persistedSignal helper; chain-mode store",
    },
    {
        file: "main/dashboard/src/dom/ai/panel/layout/resize-storage.ts",
        reason: "predates persistedSignal helper; ai-panel resize handle position",
    },
    {
        file: "main/dashboard/src/dom/clans/render-clan/persistence.ts",
        reason: "predates persistedSignal helper; clan-view tab persistence",
    },
    {
        file: "main/dashboard/src/dom/clans/account/shared/swatch-storage.ts",
        reason: "predates persistedSignal helper; color swatch picker state",
    },
    {
        file: "main/dashboard/src/dom/background/index.ts",
        reason: "predates persistedSignal helper; background fx state",
    },
    {
        file: "main/dashboard/src/dom/ai/send/storage.ts",
        reason: "predates persistedSignal helper; chat send draft state",
    },
];
