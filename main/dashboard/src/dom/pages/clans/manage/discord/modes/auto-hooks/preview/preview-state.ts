import { signal } from "../../../../../../../factory";

export interface PreviewState {
    name: string;
    triggerType: string;
    content: string;
    useEmbed: boolean;
    embedTitle: string;
    embedDescription: string;
    embedColor: string;
    embedUrl: string;
    embedAuthorName: string;
    embedAuthorIconUrl: string;
    embedFooterText: string;
    embedFooterIconUrl: string;
    embedThumbnailUrl: string;
    embedImageUrl: string;
}

export const previewState$ = signal<PreviewState | null>(null);

export function setPreviewState(state: PreviewState): void {
    previewState$.set(state);
}

export function clearPreviewState(): void {
    previewState$.set(null);
}
