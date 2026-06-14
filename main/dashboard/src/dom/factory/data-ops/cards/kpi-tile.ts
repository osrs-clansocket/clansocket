import { type ContextProps, type Instance } from "../../core/index.js";
import type { EffectProp } from "../../effect-helpers.js";
import { div } from "../../layout-ops/structural/container.js";
import { span } from "../../content-ops/text.js";
import { canvas } from "../../content-ops/graphics/media.js";

const KPI_CLASS = "kpi-tile";
const DEFAULT_EFFECT: EffectProp = { name: "rise", trigger: "intersect", once: true };
const KPI_LABEL_CLASS = "kpi-tile__label";
const KPI_VALUE_CLASS = "kpi-tile__value";
const KPI_DELTA_CLASS = "kpi-tile__delta";
const KPI_SPARK_CLASS = "kpi-tile__spark";
const SUFFIX_LABEL = "-label";
const SUFFIX_VALUE = "-value";
const SUFFIX_DELTA = "-delta";
const SUFFIX_SPARK = "-spark";
const DEFAULT_SPARK_WIDTH = 120;
const DEFAULT_SPARK_HEIGHT = 32;

interface KpiTileProps extends ContextProps {
    id: string;
    labelText: string;
    valueText?: string;
    deltaText?: string;
    sparkChartKind: string;
    sparkData: string;
    sparkWidth?: number;
    sparkHeight?: number;
}

function textPart(id: string, suffix: string, cls: string, text: string): Instance {
    return span({ classes: [cls], key: `${id}${suffix}`, text });
}

function sparkPart(props: KpiTileProps): Instance {
    const chartKey = `${props.id}${SUFFIX_SPARK}`;
    return div({ classes: [KPI_SPARK_CLASS], key: chartKey }, [
        canvas({
            chartKind: props.sparkChartKind,
            chartData: props.sparkData,
            chartKey,
            width: props.sparkWidth ?? DEFAULT_SPARK_WIDTH,
            height: props.sparkHeight ?? DEFAULT_SPARK_HEIGHT,
        }),
    ]);
}

function kpiTile(props: KpiTileProps): Instance {
    const { id, labelText, valueText, deltaText } = props;
    return div(
        {
            classes: [KPI_CLASS],
            key: id,
            attrs: { [`data-${id}`]: "" },
            effects: DEFAULT_EFFECT,
            context: props.context,
            meta: props.meta,
        },
        [
            textPart(id, SUFFIX_LABEL, KPI_LABEL_CLASS, labelText),
            textPart(id, SUFFIX_VALUE, KPI_VALUE_CLASS, valueText ?? ""),
            textPart(id, SUFFIX_DELTA, KPI_DELTA_CLASS, deltaText ?? ""),
            sparkPart(props),
        ],
    );
}

export { kpiTile };
export type { KpiTileProps };
