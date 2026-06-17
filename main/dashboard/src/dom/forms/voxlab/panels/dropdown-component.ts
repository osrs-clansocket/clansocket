import { button, div, span, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import {
    DROPDOWN_CLASS,
    DROPDOWN_LABEL_CLASS,
    DROPDOWN_LIST_CLASS,
    DROPDOWN_OPTION_CLASS,
    DROPDOWN_TRIGGER_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";

export interface DropdownOption<T extends string> {
    value: T;
    label: string;
}

export interface DropdownChangeDetail<T extends string> {
    value: T;
    label: string;
}

export class DropdownComponent<T extends string> extends BaseVoxlabComponent {
    private wrapperInstance!: Instance;
    private triggerInstance!: Instance<HTMLButtonElement>;
    private labelInstance!: Instance;
    private listInstance!: Instance;
    private readonly optionInstances = new Map<T, Instance>();
    private readonly outsideClickHandler = (e: MouseEvent): void => {
        if (!this.wrapperInstance.el.contains(e.target as Node)) {
            this.close();
        }
    };

    constructor(
        private readonly options: ReadonlyArray<DropdownOption<T>>,
        private currentValue: T,
        private readonly wrapperModifier: string | null = null,
    ) {
        super();
    }

    protected build(): HTMLElement {
        this.labelInstance = span({
            classes: [DROPDOWN_LABEL_CLASS],
            text: this.options.find((o) => o.value === this.currentValue)?.label ?? "",
            context: null,
            meta: null,
        });
        this.triggerInstance = button(
            {
                classes: [DROPDOWN_TRIGGER_CLASS],
                type: "button",
                ariaHaspopup: "listbox",
                ariaExpanded: "false",
                context: "voxlab dropdown trigger — open / close the option list",
                meta: ["action"],
                onClick: (e) => {
                    e.stopPropagation();
                    this.toggle();
                },
            },
            [this.labelInstance.el],
        );

        const optionEls: HTMLElement[] = [];
        for (const option of this.options) {
            const optionInst = this.buildOption(option);
            this.optionInstances.set(option.value, optionInst);
            optionEls.push(optionInst.el);
        }
        this.listInstance = div(
            {
                classes: [DROPDOWN_LIST_CLASS],
                attrs: { role: "listbox" },
                context: null,
                meta: null,
            },
            optionEls,
        );

        const wrapperClasses = this.wrapperModifier ? [DROPDOWN_CLASS, this.wrapperModifier] : [DROPDOWN_CLASS];
        this.wrapperInstance = div(
            {
                classes: wrapperClasses,
                data: { value: this.currentValue },
                context: null,
                meta: null,
            },
            [this.triggerInstance.el, this.listInstance.el],
        );
        this.applySelection();
        return this.wrapperInstance.el;
    }

    private buildOption(option: DropdownOption<T>): Instance {
        return div({
            classes: [DROPDOWN_OPTION_CLASS],
            attrs: { role: "option" },
            data: { value: option.value },
            ariaSelected: "false",
            text: option.label,
            context: `voxlab dropdown option — select ${option.label}`,
            meta: ["choice"],
            onClick: () => this.select(option.value),
        });
    }

    protected onMount(): void {
        // outside-click close requires a document-level listener; the factory
        // has no wireOutside-style helper for this pattern.
        document.addEventListener("click", this.outsideClickHandler);
    }

    protected onUnmount(): void {
        document.removeEventListener("click", this.outsideClickHandler);
    }

    get value(): T {
        return this.currentValue;
    }

    select(value: T): void {
        const option = this.options.find((o) => o.value === value);
        if (!option) {
            return;
        }
        this.currentValue = value;
        this.applySelection();
        this.close();
        this.emit<DropdownChangeDetail<T>>("change", { value, label: option.label });
    }

    private toggle(): void {
        if (this.wrapperInstance.el.hasAttribute("data-open")) {
            this.close();
        } else {
            this.open();
        }
    }

    private open(): void {
        this.wrapperInstance.setAttr("data-open", "");
        this.triggerInstance.setAttr("aria-expanded", "true");
    }

    private close(): void {
        this.wrapperInstance.removeAttr("data-open");
        this.triggerInstance.setAttr("aria-expanded", "false");
    }

    private applySelection(): void {
        this.wrapperInstance.setAttr("data-value", this.currentValue);
        const selected = this.options.find((o) => o.value === this.currentValue);
        if (selected) {
            this.labelInstance.setText(selected.label);
        }
        for (const [value, instance] of this.optionInstances) {
            instance.setAttr("aria-selected", value === this.currentValue ? "true" : "false");
        }
    }
}
