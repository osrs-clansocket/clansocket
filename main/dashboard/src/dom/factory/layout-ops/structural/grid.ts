import { primitive } from "../../core/index.js";

const TAG_DIV = "div";

const autoGrid = primitive(TAG_DIV, "auto-grid");
const chartGrid = primitive(TAG_DIV, "chart-grid");
const listGrid = primitive(TAG_DIV, "list-grid");
const grid = primitive(TAG_DIV);

export { autoGrid, chartGrid, listGrid, grid };
