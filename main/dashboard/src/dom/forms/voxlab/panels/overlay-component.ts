import { div, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import {
    OVERLAY_BUSY_CLASS,
    OVERLAY_BUSY_LABEL_CLASS,
    OVERLAY_BUSY_SPINNER_CLASS,
    OVERLAY_BUSY_VISIBLE_MOD,
    OVERLAY_DROP_CLASS,
    OVERLAY_EMPTY_CLASS,
    OVERLAY_EMPTY_HIDDEN_MOD,
    OVERLAY_EMPTY_HINT_CLASS,
    OVERLAY_EMPTY_TITLE_CLASS,
    OVERLAY_WRAPPER_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";

export class OverlayComponent extends BaseVoxlabComponent {
    private busyOverlay!: Instance;
    private busyLabel!: Instance;
    private emptyOverlay!: Instance;

    protected build(): HTMLElement {
        const dropOverlay = div({
            classes: [OVERLAY_DROP_CLASS],
            text: "drop an image or mesh JSON",
            context: null,
            meta: null,
        });
        this.busyOverlay = this.buildBusy();
        this.emptyOverlay = this.buildEmpty();
        const wrapper = div({ classes: [OVERLAY_WRAPPER_CLASS], context: null, meta: null }, [
            dropOverlay,
            this.busyOverlay,
            this.emptyOverlay,
        ]);
        return wrapper.el;
    }

    private buildBusy(): Instance {
        const spinner = div({
            classes: [OVERLAY_BUSY_SPINNER_CLASS],
            ariaHidden: "true",
            context: null,
            meta: null,
        });
        this.busyLabel = div({
            classes: [OVERLAY_BUSY_LABEL_CLASS],
            text: "working…",
            context: null,
            meta: null,
        });
        return div({ classes: [OVERLAY_BUSY_CLASS], context: null, meta: null }, [spinner, this.busyLabel]);
    }

    private buildEmpty(): Instance {
        const title = div({
            classes: [OVERLAY_EMPTY_TITLE_CLASS],
            text: "Voxlab",
            context: null,
            meta: null,
        });
        const hint = div({
            classes: [OVERLAY_EMPTY_HINT_CLASS],
            text: "Voxel Laboratory",
            context: null,
            meta: null,
        });
        return div({ classes: [OVERLAY_EMPTY_CLASS], context: null, meta: null }, [title, hint]);
    }

    async showBusy(label: string): Promise<void> {
        this.busyLabel.setText(label);
        this.busyOverlay.toggleClass(OVERLAY_BUSY_VISIBLE_MOD, true);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    hideBusy(): void {
        this.busyOverlay.toggleClass(OVERLAY_BUSY_VISIBLE_MOD, false);
    }

    hideEmpty(): void {
        this.emptyOverlay.toggleClass(OVERLAY_EMPTY_HIDDEN_MOD, true);
    }
}
