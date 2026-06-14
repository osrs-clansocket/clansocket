import { signal, type Signal } from "../../dom/factory/reactive";

export const selectedEmojiName: Signal<string | null> = signal<string | null>(null);
