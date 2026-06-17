import "../../../../styles/pages/voxlab/picker-page.css";

export interface FilePickerHandle {
    wrapper: HTMLElement;
    input: HTMLInputElement;
    getCurrent: () => File | null;
    clear: () => void;
}

export interface GlassFileOptions {
    label: string;
    accept: string;
    ariaLabel?: string;
}

export function createFilePicker(options: GlassFileOptions): FilePickerHandle {
    const wrapper = document.createElement("div");
    wrapper.className = "voxlab__control voxlab__control--file";

    const labelEl = document.createElement("label");
    labelEl.textContent = options.label;
    wrapper.appendChild(labelEl);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept;
    input.className = "voxlab__picker-file-input";
    input.setAttribute("aria-label", options.ariaLabel ?? options.label);
    wrapper.appendChild(input);

    return {
        wrapper,
        input,
        getCurrent: () => input.files?.[0] ?? null,
        clear: () => {
            input.value = "";
        },
    };
}
