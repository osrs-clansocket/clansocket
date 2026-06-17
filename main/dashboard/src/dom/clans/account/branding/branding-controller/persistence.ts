import { clansClient, type ClanIconKind } from "../../../../../state/clans/clans-client/index.js";
import type { BrandingController } from "./index.js";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const DEFAULT_MAX_MB = 10;

function uploadFailMessage(result: { reason: string; maxBytes?: number; mime?: string }): string {
    if (result.reason === "too_large") {
        const mb = result.maxBytes ? Math.round(result.maxBytes / BYTES_PER_MB) : DEFAULT_MAX_MB;
        return `file too large (max ${mb} MB).`;
    }
    if (result.reason === "bad_mime") return `format not supported${result.mime ? ` (${result.mime})` : ""}.`;
    if (result.reason === "process_failed") return "couldnt read the image — try a different file.";
    if (result.reason === "no_file") return "no file selected.";
    return "upload failed — try again.";
}

export async function runAutosave(ctrl: BrandingController): Promise<void> {
    if (!ctrl.isTweakable()) return;
    ctrl.hub.fire((s) => s.onSaveStateChange?.("saving"));
    const result = await clansClient.customizeClanIcon(ctrl.clan.slug, ctrl.transform);
    if (result.ok) {
        ctrl.imageVersion = result.imageVersion;
        ctrl.transform = { ...result.transform };
        const becameCustomized = !ctrl.hasCustomized;
        ctrl.hasCustomized = true;
        if (becameCustomized) {
            ctrl.hub.fire((s) => s.onCustomizedChange?.(true));
            ctrl.hub.fire((s) => s.onIconStateChange?.());
        }
        ctrl.hub.fire((s) => s.onSaveStateChange?.("idle"));
        ctrl.renderAvatar();
        ctrl.broadcast();
    } else {
        ctrl.hub.fire((s) => s.onSaveStateChange?.("error"));
    }
}

export async function revertTweaks(ctrl: BrandingController): Promise<void> {
    ctrl.autosave.cancel();
    if (!ctrl.hasCustomized) {
        ctrl.resetTransform();
        return;
    }
    ctrl.hub.fire((s) => s.onSaveStateChange?.("saving"));
    const result = await clansClient.clearClanIconCustomization(ctrl.clan.slug);
    if (!result.ok) {
        ctrl.hub.fire((s) => s.onSaveStateChange?.("error"));
        return;
    }
    ctrl.hasCustomized = false;
    ctrl.imageVersion = result.imageVersion;
    ctrl.resetTransform();
    ctrl.hub.fire((s) => s.onCustomizedChange?.(false));
    ctrl.hub.fire((s) => s.onIconStateChange?.());
    ctrl.hub.fire((s) => s.onSaveStateChange?.("idle"));
    ctrl.renderAvatar();
    ctrl.broadcast();
}

export async function persistBranding(
    ctrl: BrandingController,
    kind: ClanIconKind | null,
    value: string | null,
): Promise<void> {
    const update = await clansClient.updateClanBranding(ctrl.clan.slug, {
        iconKind: kind,
        iconValue: value,
        color: ctrl.color,
    });
    if (!update) {
        ctrl.statusEl?.setText("Save failed.");
        return;
    }
    const becameNonImage = ctrl.kind === "image" && kind !== "image";
    ctrl.kind = kind;
    ctrl.value = value;
    if (becameNonImage) {
        ctrl.hasCustomized = false;
        ctrl.resetTransform();
    }
    ctrl.hub.fire((s) => s.onIconStateChange?.());
    ctrl.renderAvatar();
    ctrl.broadcast();
    ctrl.statusEl?.setText("Saved.");
}

export async function uploadImage(ctrl: BrandingController, file: File): Promise<boolean> {
    const result = await clansClient.uploadClanIcon(ctrl.clan.slug, file);
    if (!result.ok) {
        ctrl.statusEl?.setText(uploadFailMessage(result));
        return false;
    }
    ctrl.kind = "image";
    ctrl.value = result.update.iconValue;
    ctrl.hasCustomized = false;
    ctrl.resetTransform();
    ctrl.imageVersion = Date.now();
    ctrl.hub.fire((s) => s.onCustomizedChange?.(false));
    ctrl.hub.fire((s) => s.onIconStateChange?.());
    ctrl.renderAvatar();
    ctrl.broadcast();
    ctrl.statusEl?.setText("Uploaded.");
    return true;
}
