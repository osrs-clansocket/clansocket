import { build, type ContextProps, type Instance } from "../core";
import { image } from "../content-ops/graphics/media.js";
import { span } from "../content-ops/text";
import { effect } from "../reactive";
import { rankColorClass, rankIconPath } from "../../../state/icons/rank-icons.js";
import { ranks$ } from "../../../state/identity/ranks-registry.js";

const TAG_CLASS = "rsn-tag";
const SIZE_SM_CLASS = "rsn-tag--sm";
const ICON_CLASS = "rsn-tag__icon";
const ICON_FALLBACK_CLASS = `${ICON_CLASS}--fallback`;
const NAME_CLASS = "rsn-tag__name";
const FALLBACK_ICON_SRC = "/resources/clan/static_logo.webp";

type RsnTagSize = "sm" | "md";

interface RsnTagProps extends ContextProps {
    rsn: string;
    rank?: string | null;
    size?: RsnTagSize;
    classes?: readonly string[];
}

function buildIcon(rank: string | null | undefined): Instance<HTMLImageElement> {
    if (rank !== null && rank !== undefined && rank.length > 0) {
        return image({
            src: rankIconPath(rank),
            alt: rank,
            title: rank,
            classes: [ICON_CLASS],
        });
    }
    return image({
        src: FALLBACK_ICON_SRC,
        alt: "Unknown rank",
        title: "Rank unknown",
        classes: [ICON_CLASS, ICON_FALLBACK_CLASS],
    });
}

function buildNameClasses(rank: string | null | undefined): readonly string[] {
    if (rank === null || rank === undefined || rank.length === 0) return [NAME_CLASS];
    const accent = rankColorClass(rank);
    return accent === null ? [NAME_CLASS] : [NAME_CLASS, accent];
}

function applyRankInPlace(iconEl: HTMLImageElement, nameEl: HTMLSpanElement, rank: string | null | undefined): void {
    if (rank !== null && rank !== undefined && rank.length > 0) {
        iconEl.src = rankIconPath(rank);
        iconEl.alt = rank;
        iconEl.title = rank;
        iconEl.classList.remove(ICON_FALLBACK_CLASS);
    } else {
        iconEl.src = FALLBACK_ICON_SRC;
        iconEl.alt = "Unknown rank";
        iconEl.title = "Rank unknown";
        iconEl.classList.add(ICON_FALLBACK_CLASS);
    }
    nameEl.className = buildNameClasses(rank).join(" ");
}

function rsnTag(props: RsnTagProps): Instance<HTMLSpanElement> {
    const initialRank = props.rank !== undefined ? props.rank : (ranks$().byRsn.get(props.rsn) ?? null);
    const rootClasses: string[] = [TAG_CLASS];
    if (props.size === "sm") rootClasses.push(SIZE_SM_CLASS);
    if (props.classes && props.classes.length > 0) rootClasses.push(...props.classes);
    const root = build<HTMLSpanElement>({
        tag: "span",
        classes: rootClasses,
        context: props.context,
        meta: props.meta,
    });
    const icon = buildIcon(initialRank);
    const nameSpan = span({ classes: buildNameClasses(initialRank), text: props.rsn });
    root.addChild(icon);
    root.addChild(nameSpan);
    if (props.rank !== undefined) return root;
    const dispose = effect(() => {
        const lookup = ranks$().byRsn.get(props.rsn) ?? null;
        applyRankInPlace(icon.el, nameSpan.el, lookup);
    });
    root.trackDispose(dispose);
    return root;
}

export { rsnTag };
export type { RsnTagProps, RsnTagSize };
