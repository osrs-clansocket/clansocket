import { signal } from "../../dom/factory";
import type { DiscordChannel, DiscordRole } from "./client.js";

export type DiscordInspectionTarget = { kind: "channel"; data: DiscordChannel } | { kind: "role"; data: DiscordRole };

export const selectedDiscordItem = signal<DiscordInspectionTarget | null>(null);

export function clearSelectedDiscordItem(): void {
    selectedDiscordItem.set(null);
}
