import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { div, paragraph, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import { inspectorOverride$ } from "../../../../../../state/discord/inspector-override.js";
import { clearPreviewState } from "../modes/auto-hooks/preview/preview-state.js";
import {
    DISCORD_PANE_CENTER_CLASS,
    DISCORD_PANE_PLACEHOLDER_CLASS,
} from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const PLACEHOLDER_TEXT = "Select a section from the left rail to begin.";

export interface PaneCenterHandle {
    pane: Instance;
    setMode: (modeContent: Instance) => void;
}

function buildPlaceholder(): Instance {
    return paragraph({
        classes: [DISCORD_PANE_PLACEHOLDER_CLASS],
        text: PLACEHOLDER_TEXT,
        context: null,
        meta: null,
    });
}

export function buildPaneCenter(): PaneCenterHandle {
    const pane = div({ classes: [GLASS_PANE_CLASS, DISCORD_PANE_CENTER_CLASS], context: null, meta: null }, [
        buildPlaceholder(),
    ]);
    let currentMode: Instance | null = null;
    return {
        pane,
        setMode: (modeContent: Instance): void => {
            currentMode?.destroy();
            inspectorOverride$.set(null);
            clearPreviewState();
            currentMode = modeContent;
            pane.setChildren(modeContent);
        },
    };
}
