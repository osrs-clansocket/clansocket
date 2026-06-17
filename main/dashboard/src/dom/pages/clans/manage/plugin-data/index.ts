import "../../../../../styles/pages/clans/manage/plugin-data-page.css";
import { createInstance, div, paragraph, type Instance } from "../../../../factory";
import { renderDataRights } from "../../../routes/data-rights";

const ROOT_CLASS = "clans-manage__plugin-data";
const LOADING_CLASS = "clans-manage__plugin-data-loading";
const LOADING_TEXT = "Loading plugin data…";

function buildLoading(): Instance {
    return paragraph({ classes: [LOADING_CLASS], text: LOADING_TEXT, context: null, meta: null });
}

export function buildPluginDataTab(slug: string): HTMLElement {
    const host = div({ classes: [ROOT_CLASS], context: null, meta: null }, [buildLoading()]);
    void renderDataRights({ clanFilter: slug, embedded: true }).then((el) => {
        host.setChildren(createInstance(el));
    });
    return host.el;
}
