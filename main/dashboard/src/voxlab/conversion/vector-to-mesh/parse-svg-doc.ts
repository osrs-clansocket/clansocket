const SVG_MIME = "image/svg+xml";
const PATH_SELECTOR = "path";
const ATTR_D = "d";

export function parseSvgDoc(svgText: string): string[] {
    if (typeof DOMParser === "undefined") return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, SVG_MIME);
    if (doc.querySelector("parsererror") !== null) return [];
    return collectPathStrings(doc);
}

function collectPathStrings(doc: Document): string[] {
    const paths = doc.querySelectorAll(PATH_SELECTOR);
    const out: string[] = [];
    for (const node of paths) {
        if (!(node instanceof Element)) continue;
        const d = node.getAttribute(ATTR_D);
        if (d === null) continue;
        const trimmed = d.trim();
        if (trimmed.length === 0) continue;
        out.push(trimmed);
    }
    return out;
}
