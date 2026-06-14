import { button, div, span, type Instance } from "../../../factory/index.js";

export const GD_ROOT = "glass-date";
export const GD_OPEN = "glass-date--open";
export const GD_TRIGGER = "glass-date__trigger";
export const GD_LABEL = "glass-date__label";
export const GD_POPUP = "glass-date__popup";
export const GD_NAV = "glass-date__nav";
export const GD_NAV_BTN = "glass-date__nav-btn";
export const GD_TITLE = "glass-date__title";
export const GD_GRID = "glass-date__grid";
export const GD_DOW = "glass-date__dow";
export const GD_DAY = "glass-date__day";
export const GD_DAY_TODAY = "glass-date__day--today";
export const GD_DAY_SELECTED = "glass-date__day--selected";
export const GD_DAY_MUTED = "glass-date__day--muted";
export const DATA_KEY_DATE = "date";
export const DATA_KEY_NAV_DIR = "nav-dir";
export const ATTR_DATE = `data-${DATA_KEY_DATE}`;
export const ATTR_NAV_DIR = `data-${DATA_KEY_NAV_DIR}`;

const DOW_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SINGLE_DIGIT_MAX = 10;
const DAYS_PER_WEEK = 7;
const WEEKS_SHOWN = 6;

function pad2(n: number): string {
    return n < SINGLE_DIGIT_MAX ? `0${n}` : String(n);
}

export function isoDate(d: Date): string {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

const ISO_DATE_LEN = 10;
const ISO_DASH_AT_4 = 4;
const ISO_DASH_AT_7 = 7;

function isIsoDateShape(s: string): boolean {
    if (s.length !== ISO_DATE_LEN) return false;
    if (s[ISO_DASH_AT_4] !== "-" || s[ISO_DASH_AT_7] !== "-") return false;
    for (let i = 0; i < s.length; i++) {
        if (i === ISO_DASH_AT_4 || i === ISO_DASH_AT_7) continue;
        const c = s[i];
        if (c < "0" || c > "9") return false;
    }
    return true;
}

export function parseIso(s: string): Date | null {
    if (!isIsoDateShape(s)) return null;
    const ms = Date.parse(`${s}T00:00:00Z`);
    return Number.isFinite(ms) ? new Date(ms) : null;
}

function monthFirstUTC(year: number, month: number): Date {
    return new Date(Date.UTC(year, month, 1));
}

function monthTitle(d: Date): string {
    return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function buildPopupContents(viewDate: Date, selectedIso: string): Instance {
    const today = isoDate(new Date());
    const year = viewDate.getUTCFullYear();
    const month = viewDate.getUTCMonth();
    const first = monthFirstUTC(year, month);
    const firstDow = (first.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
    const start = new Date(first);
    start.setUTCDate(1 - firstDow);

    const prev = button({
        classes: [GD_NAV_BTN],
        ariaLabel: "Previous month",
        type: "button",
        data: { [DATA_KEY_NAV_DIR]: "-1" },
        text: "‹",
        context: "show the previous month",
        meta: ["action"],
    });
    const next = button({
        classes: [GD_NAV_BTN],
        ariaLabel: "Next month",
        type: "button",
        data: { [DATA_KEY_NAV_DIR]: "1" },
        text: "›",
        context: "show the next month",
        meta: ["action"],
    });
    const title = span({ classes: [GD_TITLE], text: monthTitle(viewDate), context: null, meta: null });
    const nav = div({ classes: [GD_NAV], context: null, meta: null }, [prev, title, next]);

    const cells: Instance[] = DOW_LABELS.map((l) => span({ classes: [GD_DOW], text: l, context: null, meta: null }));
    const cursor = new Date(start);
    for (let i = 0; i < WEEKS_SHOWN * DAYS_PER_WEEK; i++) {
        const iso = isoDate(cursor);
        const inMonth = cursor.getUTCMonth() === month;
        const classes = [GD_DAY];
        if (!inMonth) classes.push(GD_DAY_MUTED);
        if (iso === today) classes.push(GD_DAY_TODAY);
        if (iso === selectedIso) classes.push(GD_DAY_SELECTED);
        cells.push(
            button({
                classes,
                type: "button",
                data: { [DATA_KEY_DATE]: iso },
                text: String(cursor.getUTCDate()),
                context: "select this date",
                meta: ["choice"],
            }),
        );
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const grid = div({ classes: [GD_GRID], context: null, meta: null }, cells);
    return div({ context: null, meta: null }, [nav, grid]);
}
