import { build, type Instance, type Child, type BaseProps } from "../../core/index.js";

const PANEL_CLASS = "panel";
const PANEL_FULL = "panel--full";
const PANEL_KPI = "panel--kpi";
const TAG_DIV = "div";

type PanelVariant = "full" | "kpi" | "default";

const VARIANT_CLASS: Record<PanelVariant, string | null> = {
    full: PANEL_FULL,
    kpi: PANEL_KPI,
    default: null,
};

interface PanelProps extends BaseProps {
    variant?: PanelVariant;
}

function panelClasses(variant: PanelVariant | undefined, extra: readonly string[] | undefined): readonly string[] {
    const variantCls = VARIANT_CLASS[variant ?? "default"];
    const base = variantCls ? [PANEL_CLASS, variantCls] : [PANEL_CLASS];
    return extra && extra.length > 0 ? [...base, ...extra] : base;
}

function panel(props: PanelProps = {}, children: readonly Child[] = []): Instance {
    return build({
        ...props,
        tag: TAG_DIV,
        classes: panelClasses(props.variant, props.classes),
        children,
    });
}

export { panel };
export type { PanelProps, PanelVariant };
