import type { Instance } from "../../../../factory";
import { type IconTransform, type ManagedClan } from "../../../../../state/clans/clans-client/index.js";
import { AppEvents, events, type ClanBrandingChangedPayload } from "../../../../../managers/events";
import { normalizeHex } from "../../shared/format";
import { AutosaveManager } from "./autosave-manager.js";
import { renderClanAvatar } from "./avatar-render.js";
import { ListenerHub } from "./listener-hub.js";
import { persistBranding, revertTweaks, runAutosave, uploadImage } from "./persistence.js";
import { AUTOSAVE_DEBOUNCE_MS, DEFAULT_BRAND_COLOR, IDENTITY_TRANSFORM, type TweakerListeners } from "./types.js";

export { DEFAULT_BRAND_COLOR, IDENTITY_TRANSFORM, type TweakerListeners } from "./types.js";

export class BrandingController {
    color: string;
    kind: "builtin" | "image" | null;
    value: string | null;
    imageVersion: number;
    hasCustomized: boolean;
    transform: IconTransform;
    avatarEl: HTMLElement | null = null;
    statusEl: Instance | null = null;
    triggerUpload: () => void = () => {};
    readonly hub = new ListenerHub<TweakerListeners>();
    readonly autosave: AutosaveManager;

    constructor(public readonly clan: ManagedClan) {
        this.color = normalizeHex(clan.color ?? "") ?? DEFAULT_BRAND_COLOR;
        this.kind = clan.iconKind ?? null;
        this.value = clan.iconValue ?? null;
        this.hasCustomized = clan.iconCustomized ?? false;
        this.transform = clan.iconTransform ? { ...clan.iconTransform } : { ...IDENTITY_TRANSFORM };
        this.imageVersion = Date.now();
        this.autosave = new AutosaveManager(AUTOSAVE_DEBOUNCE_MS, () => runAutosave(this));
    }

    subscribe(listener: TweakerListeners): () => void {
        return this.hub.add(listener);
    }

    isTweakable(): boolean {
        if (this.kind !== "image") return false;
        if (this.value === "ico" || this.value === "svg") return false;
        return true;
    }

    pristineIconUrl(): string {
        return `/api/clans/${this.clan.slug}/icon?v=${this.imageVersion}&pristine=1`;
    }

    iconUrl(): string {
        return `/api/clans/${this.clan.slug}/icon?v=${this.imageVersion}`;
    }

    setTransform(partial: Partial<IconTransform>): void {
        this.transform = { ...this.transform, ...partial };
        this.hub.fire((s) => s.onTransformChange?.(this.transform));
        this.autosave.schedule();
    }

    resetTransform(): void {
        this.transform = { ...IDENTITY_TRANSFORM };
        this.hub.fire((s) => s.onTransformChange?.(this.transform));
    }

    renderAvatar(): void {
        if (!this.avatarEl) return;
        renderClanAvatar({
            avatarEl: this.avatarEl,
            slug: this.clan.slug,
            iconKind: this.kind,
            iconValue: this.value,
            imageVersion: this.imageVersion,
            color: this.color,
        });
    }

    broadcast(): void {
        const payload: ClanBrandingChangedPayload = {
            slug: this.clan.slug,
            iconKind: this.kind,
            iconValue: this.value,
            color: this.color,
            imageVersion: this.imageVersion,
        };
        events.emit(AppEvents.CLAN_BRANDING_CHANGED, payload);
    }

    revertTweaks(): Promise<void> {
        return revertTweaks(this);
    }

    persist(kind: "builtin" | "image" | null, value: string | null): Promise<void> {
        return persistBranding(this, kind, value);
    }

    uploadImage(file: File): Promise<boolean> {
        return uploadImage(this, file);
    }
}
