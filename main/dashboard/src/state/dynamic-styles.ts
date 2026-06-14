export function setDynProp(el: HTMLElement, name: string, value: string): void {
    el.style.setProperty(name, value);
}

export function setDynProps(el: HTMLElement, props: Record<string, string>): void {
    for (const [name, value] of Object.entries(props)) {
        el.style.setProperty(name, value);
    }
}
