import { button, div, heading, section, span, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import type { LayoutSide } from "../../../../shared/types/voxlab/layout-types.js";
import {
    SHELL_ACTIONS_CLASS,
    SHELL_BODY_CLASS,
    SHELL_BTN_CLASS,
    SHELL_CLASS,
    SHELL_TITLE_CLASS,
    SHELL_TOOLBAR_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";

export type ShellAction = "up" | "down" | "swap" | "toggle-collapse";

export interface ShellActionDetail {
    id: string;
    action: ShellAction;
}

export interface LayoutShellOptions {
    id: string;
    title: string;
    side: LayoutSide;
    collapsed: boolean;
}

const SWAP_ARROW_LEFT = "⇒";
const SWAP_ARROW_RIGHT = "⇐";
const COLLAPSE_GLYPH_OPEN = "▾";
const COLLAPSE_GLYPH_CLOSED = "▸";

export class LayoutShellComponent extends BaseVoxlabComponent {
    private bodyInstance!: Instance;
    private titleInstance!: Instance;
    private collapseInstance!: Instance;
    private upInstance!: Instance;
    private downInstance!: Instance;
    private swapInstance!: Instance;
    private rootInstance!: Instance;

    constructor(private options: LayoutShellOptions) {
        super();
    }

    get body(): HTMLElement {
        void this.root;
        return this.bodyInstance.el;
    }

    setTitle(title: string): void {
        this.options.title = title;
        this.titleInstance.setText(title);
    }

    setSide(side: LayoutSide): void {
        this.options.side = side;
        this.rootInstance.setAttr("data-side", side);
        const goingRight = side === "left";
        this.swapInstance.setAttr("title", goingRight ? "Send to right" : "Send to left");
        this.swapInstance.setText(goingRight ? SWAP_ARROW_LEFT : SWAP_ARROW_RIGHT);
    }

    setCollapsed(collapsed: boolean): void {
        this.options.collapsed = collapsed;
        this.rootInstance.setAttr("data-collapsed", collapsed ? "true" : "false");
        this.collapseInstance.setText(collapsed ? COLLAPSE_GLYPH_CLOSED : COLLAPSE_GLYPH_OPEN);
        this.collapseInstance.setAttr("title", collapsed ? "Expand" : "Collapse");
    }

    setMovability(canUp: boolean, canDown: boolean): void {
        this.upInstance.setAttr("disabled", canUp ? null : "true");
        this.downInstance.setAttr("disabled", canDown ? null : "true");
    }

    protected build(): HTMLElement {
        const toolbar = this.buildToolbar();
        this.bodyInstance = div({ classes: [SHELL_BODY_CLASS], context: null, meta: null });
        this.rootInstance = section(
            {
                classes: [SHELL_CLASS],
                data: {
                    "shell-id": this.options.id,
                    side: this.options.side,
                    collapsed: this.options.collapsed ? "true" : "false",
                },
                context: null,
                meta: null,
            },
            [toolbar.el, this.bodyInstance.el],
        );
        return this.rootInstance.el;
    }

    private buildToolbar(): Instance {
        this.upInstance = this.buildIconButton("▲", "Move up", "up");
        this.downInstance = this.buildIconButton("▼", "Move down", "down");
        const arrows = div({ classes: [SHELL_ACTIONS_CLASS], context: null, meta: null }, [
            this.upInstance.el,
            this.downInstance.el,
        ]);

        this.titleInstance = span({
            classes: [SHELL_TITLE_CLASS],
            text: this.options.title,
            context: null,
            meta: null,
        });

        const goingRight = this.options.side === "left";
        this.swapInstance = this.buildIconButton(
            goingRight ? SWAP_ARROW_LEFT : SWAP_ARROW_RIGHT,
            goingRight ? "Send to right" : "Send to left",
            "swap",
        );
        this.collapseInstance = this.buildIconButton(
            this.options.collapsed ? COLLAPSE_GLYPH_CLOSED : COLLAPSE_GLYPH_OPEN,
            this.options.collapsed ? "Expand" : "Collapse",
            "toggle-collapse",
        );
        const rightActions = div({ classes: [SHELL_ACTIONS_CLASS], context: null, meta: null }, [
            this.collapseInstance.el,
            this.swapInstance.el,
        ]);

        return heading("header", { classes: [SHELL_TOOLBAR_CLASS], context: null, meta: null }, [
            arrows.el,
            this.titleInstance.el,
            rightActions.el,
        ]);
    }

    private buildIconButton(text: string, title: string, action: ShellAction): Instance {
        return button({
            classes: [SHELL_BTN_CLASS],
            text,
            title,
            type: "button",
            context: `${title.toLowerCase()} the voxlab shell panel`,
            meta: ["action"],
            onClick: () => this.dispatch(action),
        });
    }

    private dispatch(action: ShellAction): void {
        this.dispatchEvent(
            new CustomEvent<ShellActionDetail>("shell-action", {
                detail: { id: this.options.id, action },
                bubbles: true,
            }),
        );
    }
}
