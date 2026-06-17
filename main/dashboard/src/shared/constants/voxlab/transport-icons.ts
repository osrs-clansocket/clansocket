const SVG_PROPS =
    'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"';

function svg(content: string): string {
    return `<svg ${SVG_PROPS}>${content}</svg>`;
}

export const TRANSPORT_ICONS = {
    start: svg('<path d="M6 5h2v14H6zM20 5v14L9 12z"/>'),
    prevFrame: svg('<path d="M12 5L1 12l11 7zM23 5L12 12l11 7z"/>'),
    play: svg('<path d="M6 4l14 8-14 8z"/>'),
    pause: svg('<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'),
    stop: svg('<rect x="5" y="5" width="14" height="14"/>'),
    nextFrame: svg('<path d="M1 5l11 7-11 7zM12 5l11 7-11 7z"/>'),
    end: svg('<path d="M4 5v14l11-7zM16 5h2v14h-2z"/>'),
    loop: svg(
        '<path d="M17 4v3h-9a4 4 0 0 0-4 4v2h2v-2a2 2 0 0 1 2-2h9v3l5-4zM7 20v-3h9a4 4 0 0 0 4-4v-2h-2v2a2 2 0 0 1-2 2H7v-3l-5 4z"/>',
    ),
    smoothingCurve: svg(
        '<path d="M2 18 Q 7 4 12 12 T 22 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    ),
    smoothingLinear: svg(
        '<path d="M2 18 L 8 4 L 14 14 L 22 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    ),
};
