import { primitive, type BaseProps, type Child, type Instance } from "../core";

const TAG_H2 = "h2";
const TAG_SPAN = "span";
const SECTION_TITLE_CLASS = "section-title";
const SECTION_SUBTITLE_CLASS = "section-subtitle";
const PANEL_TITLE_CLASS = "panel__title";

function heading(tag: string, props: BaseProps = {}, children: readonly Child[] = []): Instance {
    return primitive(tag)(props, children);
}

const span = primitive(TAG_SPAN);
const paragraph = primitive("p");
const anchor = primitive("a");
const code = primitive("code");
const pre = primitive("pre");
const details = primitive("details");
const summary = primitive("summary");
const sectionTitle = primitive(TAG_H2, SECTION_TITLE_CLASS);
const sectionSubtitle = primitive(TAG_SPAN, SECTION_SUBTITLE_CLASS);
const panelTitle = primitive(TAG_H2, PANEL_TITLE_CLASS);

export { heading, span, paragraph, anchor, code, pre, details, summary, sectionTitle, sectionSubtitle, panelTitle };
