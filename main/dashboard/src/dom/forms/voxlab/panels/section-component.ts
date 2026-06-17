import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import {
    createColorInput,
    createSliderInput,
    createToggleInput,
} from "../../../../voxlab/formatters/control-formatter.js";
import { snapshotRegistry, type PathSpec } from "../../../../state/voxlab/registries/snapshot-registry.js";
import { DropdownComponent, type DropdownChangeDetail } from "./dropdown-component.js";

export interface SliderFieldConfig<TSettings, K extends keyof TSettings> {
    type: "slider";
    key: K;
    label: string;
    min: number;
    max: number;
    step: number;
    formatValue?: (n: number) => string;
    snapshotPath?: PathSpec;
}

export interface ColorFieldConfig<TSettings, K extends keyof TSettings> {
    type: "color";
    key: K;
    label: string;
    snapshotPath?: PathSpec;
}

export interface ToggleFieldConfig<TSettings, K extends keyof TSettings> {
    type: "toggle";
    key: K;
    label: string;
    snapshotPath?: PathSpec;
}

export interface DropdownFieldConfig<TSettings, K extends keyof TSettings, V extends string> {
    type: "dropdown";
    key: K;
    options: ReadonlyArray<{ value: V; label: string }>;
    snapshotPath?: PathSpec;
}

export type SectionField<TSettings> =
    | SliderFieldConfig<TSettings, keyof TSettings>
    | ColorFieldConfig<TSettings, keyof TSettings>
    | ToggleFieldConfig<TSettings, keyof TSettings>
    | DropdownFieldConfig<TSettings, keyof TSettings, string>;

export interface SectionConfig<TSettings extends object> {
    snapshotName: string;
    title: string;
    eventName: string;
    defaults: TSettings;
    fields: ReadonlyArray<SectionField<TSettings>>;
}

export class SectionComponent<TSettings extends object> extends BaseVoxlabComponent {
    private settings: TSettings;
    private readonly inputsByKey = new Map<keyof TSettings, HTMLInputElement>();
    private readonly dropdownsByKey = new Map<keyof TSettings, DropdownComponent<string>>();

    constructor(private readonly config: SectionConfig<TSettings>) {
        super();
        this.settings = { ...config.defaults };
        const paths = config.fields.map((f) => f.snapshotPath).filter((p): p is PathSpec => p !== undefined);
        snapshotRegistry.register<TSettings>({
            name: config.snapshotName,
            getState: () => this.current,
            applyState: (state, opts) => this.apply(state, opts),
            paths,
        });
    }

    get current(): TSettings {
        return { ...this.settings };
    }

    apply(state: TSettings, opts?: { silent?: boolean }): void {
        this.settings = { ...state };
        for (const field of this.config.fields) {
            const value = this.settings[field.key];
            if (field.type === "dropdown") {
                this.dropdownsByKey.get(field.key)?.select(String(value));
                continue;
            }
            const input = this.inputsByKey.get(field.key);
            if (!input) {
                continue;
            }
            if (field.type === "toggle") {
                input.checked = Boolean(value);
            } else {
                input.value = String(value);
            }
        }
        if (!opts?.silent) {
            this.emit<TSettings>(this.config.eventName, this.current);
        }
    }

    reset(): void {
        this.apply({ ...this.config.defaults });
    }

    protected build(): HTMLElement {
        const section = document.createElement("div");
        section.className = "voxlab__footer-section";
        const heading = document.createElement("h3");
        heading.className = "voxlab__footer-section-heading";
        heading.textContent = this.config.title;
        section.appendChild(heading);

        const emit = (): void => {
            this.emit<TSettings>(this.config.eventName, this.current);
        };

        for (const field of this.config.fields) {
            const defaultValue = this.config.defaults[field.key];
            if (field.type === "slider") {
                const { wrapper, input } = createSliderInput({
                    label: field.label,
                    min: field.min,
                    max: field.max,
                    step: field.step,
                    value: defaultValue as number,
                    formatValue: field.formatValue,
                });
                input.addEventListener("input", () => {
                    (this.settings as Record<string, unknown>)[field.key as string] = Number.parseFloat(input.value);
                    emit();
                });
                section.appendChild(wrapper);
                this.inputsByKey.set(field.key, input);
            } else if (field.type === "color") {
                const { wrapper, input } = createColorInput({
                    label: field.label,
                    value: defaultValue as string,
                });
                input.addEventListener("input", () => {
                    (this.settings as Record<string, unknown>)[field.key as string] = input.value;
                    emit();
                });
                section.appendChild(wrapper);
                this.inputsByKey.set(field.key, input);
            } else if (field.type === "toggle") {
                const { wrapper, input } = createToggleInput({
                    label: field.label,
                    checked: defaultValue as boolean,
                });
                input.addEventListener("change", () => {
                    (this.settings as Record<string, unknown>)[field.key as string] = input.checked;
                    emit();
                });
                section.appendChild(wrapper);
                this.inputsByKey.set(field.key, input);
            } else if (field.type === "dropdown") {
                const dropdown = new DropdownComponent<string>(
                    field.options,
                    String(defaultValue),
                    "voxlab__dropdown--banner",
                );
                dropdown.mount(section);
                dropdown.addEventListener("change", (e) => {
                    const detail = (e as CustomEvent<DropdownChangeDetail<string>>).detail;
                    (this.settings as Record<string, unknown>)[field.key as string] = detail.value;
                    emit();
                });
                this.dropdownsByKey.set(field.key, dropdown);
            }
        }
        return section;
    }

    protected onUnmount(): void {
        for (const dd of this.dropdownsByKey.values()) {
            dd.unmount();
        }
    }
}
