import { selectedDiscordItem, type DiscordInspectionTarget } from "./selected-item.js";
import { selectedEmojiName } from "./selected-emoji.js";

export function selectDiscordItem(target: DiscordInspectionTarget): void {
    selectedEmojiName.set(null);
    selectedDiscordItem.set(target);
}

export function selectDiscordEmoji(name: string): void {
    selectedDiscordItem.set(null);
    selectedEmojiName.set(name);
}

export function clearInspectorSelection(): void {
    selectedDiscordItem.set(null);
    selectedEmojiName.set(null);
}
