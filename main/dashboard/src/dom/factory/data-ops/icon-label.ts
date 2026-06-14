import { build, type ContextProps, type Instance } from "../core";
import { image } from "../content-ops/graphics/media.js";
import { span } from "../content-ops/text";
import { buildIconSrc, resolveIcon } from "../../../icons/providers.js";

type IconLabelSize = "sm" | "md" | "lg" | "xl";

const ICON_LABEL_SIZE_SM: IconLabelSize = "sm";
const ICON_LABEL_SIZE_MD: IconLabelSize = "md";
const ICON_LABEL_SIZE_LG: IconLabelSize = "lg";
const ICON_LABEL_SIZE_XL: IconLabelSize = "xl";

const ROW_CLASS = "icon-label";
const ICON_CLASS = "icon-label__icon";
const LABEL_CLASS = "icon-label__label";
const SIZE_PREFIX = "icon-label--";
const DEFAULT_SIZE: IconLabelSize = ICON_LABEL_SIZE_MD;

interface IconLabelProps extends ContextProps {
    name: string;
    label?: string;
    size?: IconLabelSize;
    alt?: string;
    title?: string;
    classes?: readonly string[];
    iconClasses?: readonly string[];
    labelClasses?: readonly string[];
    trailing?: Instance;
}

interface IconLabelInstance {
    instance: Instance<HTMLSpanElement>;
    iconInst: Instance<HTMLImageElement>;
    labelInst: Instance<HTMLSpanElement>;
}

function rowClasses(props: IconLabelProps): readonly string[] {
    const sizeClass = `${SIZE_PREFIX}${props.size ?? DEFAULT_SIZE}`;
    const base = [ROW_CLASS, sizeClass];
    return props.classes && props.classes.length > 0 ? [...base, ...props.classes] : base;
}

function joinedClasses(baseClass: string, extra: readonly string[] | undefined): readonly string[] {
    return extra && extra.length > 0 ? [baseClass, ...extra] : [baseClass];
}

function resolveSrc(iconName: string): string {
    const resolved = resolveIcon(iconName);
    const src = buildIconSrc(resolved.provider, resolved.name);
    if (src === null) throw new Error(`iconLabel: unable to resolve "${iconName}"`);
    return src;
}

function iconLabel(props: IconLabelProps): IconLabelInstance {
    const root = build<HTMLSpanElement>({
        tag: "span",
        classes: rowClasses(props),
        context: props.context,
        meta: props.meta,
    });
    const iconInst = image({
        src: resolveSrc(props.name),
        alt: props.alt ?? "",
        title: props.title,
        classes: joinedClasses(ICON_CLASS, props.iconClasses),
        lazy: false,
    });
    const labelInst = span({
        classes: joinedClasses(LABEL_CLASS, props.labelClasses),
        text: props.label,
    });
    root.addChild(iconInst);
    root.addChild(labelInst);
    if (props.trailing !== undefined) root.addChild(props.trailing);
    return { instance: root, iconInst, labelInst };
}

export { iconLabel, ICON_LABEL_SIZE_SM, ICON_LABEL_SIZE_MD, ICON_LABEL_SIZE_LG, ICON_LABEL_SIZE_XL };
export type { IconLabelProps, IconLabelInstance, IconLabelSize };
