import { primitive } from "../../core/index.js";

const TAG_DIV = "div";

const divider = primitive("hr", "divider");
const vr = primitive(TAG_DIV, "vr");
const spacer = primitive(TAG_DIV, "spacer");
const texture = primitive(TAG_DIV, "texture");

export { divider, vr, spacer, texture };
