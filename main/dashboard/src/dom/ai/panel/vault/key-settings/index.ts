import { createInstance } from "../../../../factory";
import { vaultExists } from "../../../../../ai/vault/vault/index.js";
import { isUnlocked, onLockChange } from "../../../../../ai/vault/session.js";
import { renderVaultSetup } from "../vault-setup.js";
import { renderVaultUnlock } from "../vault-unlock.js";
import { type KeySettingsHandle, type KeySettingsOpts, type UnlockedSub } from "./constants.js";
import { renderListView } from "./list.js";
import { renderEditorView } from "./editor/index.js";

async function renderKeySettings(
    bodyHost: HTMLElement,
    footerHost: HTMLElement,
    opts: KeySettingsOpts = {},
): Promise<KeySettingsHandle> {
    const body = createInstance(bodyHost);
    const footer = createInstance(footerHost);
    let sub: UnlockedSub = { mode: "list" };
    const setSub = (next: UnlockedSub): void => {
        sub = next;
    };

    const offLockChange = onLockChange(() => {
        sub = { mode: "list" };
        renderState().catch(() => undefined);
    });

    async function renderState(): Promise<void> {
        body.clear();
        footer.clear();
        const exists = await vaultExists();
        if (!exists) {
            renderVaultSetup(bodyHost, footerHost, { onReady: () => opts.onChange?.() });
            return;
        }
        if (!isUnlocked()) {
            renderVaultUnlock(bodyHost, footerHost, { onUnlocked: () => opts.onChange?.() });
            return;
        }
        if (sub.mode === "list") await renderListView(bodyHost, footerHost, setSub, renderState);
        else await renderEditorView({ bodyHost, footerHost, sub, setSub, rerender: renderState, opts });
    }

    await renderState();

    function destroy(): void {
        offLockChange();
        body.clear();
        footer.clear();
    }

    return { el: bodyHost, destroy };
}

export { renderKeySettings };
